
import { renderCellVarGraphVertexShader, renderCellVarGraphFragmentShader, renderCellVarGraphComputeShader } from './CellVarGraphShaders';
import { createGPUBuffer, createGPUBufferUint} from '../helpers/helper';
import { cellObj } from '../helpers/manageCellModelGUI';
import { GUI } from 'dat.gui';

class CellVarGraph {
    
    device: GPUDevice;
    canvas: HTMLCanvasElement;
    textureFormat: GPUTextureFormat;
    gui: GUI;
    numPoints: number;
    min: number;
    max: number;
    nodeIdx: number;
    varName: string;
    context: GPUCanvasContext;
    renderPipeline: GPURenderPipeline;
    computePipeline: GPUComputePipeline;
    renderPassDescriptor: GPURenderPassDescriptor;
    numberOfIndexes     : number;
    xCoordsBuffer       : GPUBuffer;
    indexBuffer         : GPUBuffer;
    voiBuffer           : GPUBuffer;
    voiBufferCopy       : GPUBuffer;
    visualParamsBuffer  : GPUBuffer;
    nodeIdxBuffer       : GPUBuffer;
    cellObj             : cellObj;
    nNodes              : number;
    workgroupSize       : number;
    computeBindGroup: GPUBindGroup | null = null;
    statesBuffer: GPUBuffer | null = null;

    constructor(device: GPUDevice, canvas: HTMLCanvasElement, textureFormat: GPUTextureFormat, cellObj:cellObj, nNodes:number,
        gui:GUI, workgroupSize:number=64) {
        this.device = device;
        this.textureFormat = textureFormat;
        this.canvas = canvas;
        this.gui = gui;
        this.min = gui.__folders.Visualization.__controllers[0].getValue();
        this.max = gui.__folders.Visualization.__controllers[1].getValue();
        this.nodeIdx = gui.__folders.Visualization.__controllers[2].getValue();
        this.varName = gui.__folders.Visualization.__controllers[3].getValue();
        this.numPoints = gui.__folders.Visualization.__controllers[4].getValue();
        this.cellObj = cellObj;
        this.nNodes    = nNodes;
        this.workgroupSize = workgroupSize;

        if ((this.nodeIdx<0) || (this.nodeIdx>=this.nNodes)){
            // Do not be stupid do not throw an error -> the graph will only show a constant value
            // throw new Error(`The selected node ${this.nodeIdx} is out of range of a mesh with ${this.nNodes} nodes`)
            console.log(`The selected node ${this.nodeIdx} is out of range for a mesh with ${this.nNodes} nodes`)
        }

        // INIT RENDERING
        const devicePixelRatio = window.devicePixelRatio || 1;
        this.context = this.canvas.getContext('webgpu') as unknown as GPUCanvasContext;
        this.canvas.width = this.canvas.clientWidth * devicePixelRatio
        this.canvas.height = this.canvas.clientHeight * devicePixelRatio
        
        this.context.configure({
            device: this.device,
            format: this.textureFormat,
            alphaMode: "opaque" // All pixels should be opaque without any alpha??
        });
        

        this.renderPipeline = this.device.createRenderPipeline({
            label: 'CellVarGraph_RenderPipeline',
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({                    
                    code: renderCellVarGraphVertexShader
                }),
                entryPoint: "vs_main",
                buffers:[
                    {
                        arrayStride: Float32Array.BYTES_PER_ELEMENT,
                        attributes: [
                            {
                                //X coordinates
                                shaderLocation: 0,
                                format: "float32",
                                offset: 0
                            }
                        ]
                    },
                    {
                        arrayStride: Float32Array.BYTES_PER_ELEMENT,
                        attributes: [
                            {
                                //VoiBuffer
                                shaderLocation: 1,
                                format: "float32",
                                offset: 0
                            }
                        ]
                    }
                ]
            },
            fragment: {
                module: this.device.createShaderModule({                    
                    code: renderCellVarGraphFragmentShader
                }),
                entryPoint: "fs_main",
                targets: [
                    {
                        format: this.textureFormat as GPUTextureFormat
                    }
                ]
            },
            primitive:{
                topology: "line-list",
                // cullMode: 'back'
            },
        });

        this.renderPassDescriptor = {
            label: 'CellVarGraph_RenderPassDescriptor',
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.3, g: 0.2, b: 0.4, a: 1.0 }, //background color
                loadOp: 'clear' as GPULoadOp,
                storeOp: 'store' as GPUStoreOp
            }],
        };

        
        //  INIT BUFFERS
        const indexs        = this.getIndexesForLine();
        const xcoords       = this.getXCoords();
        const voiInitValues = new Float32Array(this.numPoints);
        if (this.varName in this.cellObj.states) {
            voiInitValues.fill(((this.cellObj.states[this.varName] - this.min) / (this.max-this.min)) * 2 - 1); //remember this should be between [-1,1]
        } else {
            throw new Error(`${this.varName} is not a state variable of model ${this.cellObj.cellModel}`)
        }
        this.numberOfIndexes  = indexs.length;
        this.xCoordsBuffer    = createGPUBuffer(this.device, xcoords);
        this.indexBuffer      = createGPUBufferUint(this.device, indexs);
        this.voiBuffer        = createGPUBuffer(this.device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
        this.voiBufferCopy    = createGPUBuffer(this.device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);  // this avoids dara race

        // ExtraBuffers
        const visualParamsArray = new Float32Array([this.min, this.max]);
        this.visualParamsBuffer = this.device.createBuffer({
            label: "CellVarGraph_VisualParamsBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.nodeIdxBuffer = this.device.createBuffer({
            label: "CellVarGraph_nodeIdxBuffer",
            size: Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;


        // INIT - COMPUTE
        this.computePipeline = this.device.createComputePipeline({
            label: 'CellVarGraph_ComputePipeline',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: renderCellVarGraphComputeShader(this.cellObj.cellModel, this.nNodes, this.numPoints, this.varName, this.workgroupSize)}),
                entryPoint: 'comp_main',
            },
        });

    }

    private getIndexesForLine(): Uint32Array{
        var indexs = new Uint32Array((this.numPoints-1)*2);
        
        var j = 1;
        indexs[0] = 0;
        for( let i=1; i<this.numPoints; i++){
            indexs[j] = i;
            if (j+1 >= indexs.length){break;}
            indexs[j+1] = i;
            j+=2;
        }
        return indexs;
    }
    
    private getXCoords(): Float32Array {
        const x = new Float32Array(this.numPoints);
        for (let i = 0; i < this.numPoints; i++) {
            x[i] = (2 * (i/this.numPoints)) - 1;
        }
        return x;
    }

    setStatesBuffer(statesBuffer:GPUBuffer, statesByteLength:number){
        
        this.statesBuffer = statesBuffer;

        this.computeBindGroup = this.device.createBindGroup({
            label: 'CellVarGraph_ComputeBindGroup',
            layout: this.computePipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.voiBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.numPoints,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: this.statesBuffer,
                            offset: 0,
                            size: statesByteLength,
                        },
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: this.visualParamsBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * 2,  //min and max
                        },
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: this.nodeIdxBuffer,
                            offset: 0,
                            size: Uint32Array.BYTES_PER_ELEMENT,
                        },
                    },
                    {
                        binding: 4,
                        resource: {
                            buffer: this.voiBufferCopy,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.numPoints,
                        },
                    }
                ],
        });
    }

    render(commandEncoder: GPUCommandEncoder){

        this.device.queue.writeBuffer(
            this.visualParamsBuffer,
            0,
            new Float32Array([
                this.gui.__folders.Visualization.__controllers[0].getValue(),   
                this.gui.__folders.Visualization.__controllers[1].getValue()
            ])
        );
        
        this.nodeIdx = this.gui.__folders.Visualization.__controllers[2].getValue()
        this.device.queue.writeBuffer(
            this.nodeIdxBuffer,
            0,
            new Uint32Array([this.nodeIdx]) //Is neccesary to make a UintArray even if it is one element
        );

        {   //Compute Update
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline);
            passEncoder.setBindGroup(0, this.computeBindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(this.numPoints / this.workgroupSize));
            passEncoder.end();
        }
        {   //Render Update
            const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
            colorAttachments[0].view = this.context.getCurrentTexture().createView();
    
            const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
            passEncoder.setPipeline(this.renderPipeline);
            passEncoder.setVertexBuffer(0, this.xCoordsBuffer);
            passEncoder.setVertexBuffer(1, this.voiBuffer);
            passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
            passEncoder.drawIndexed(this.numberOfIndexes);
            passEncoder.end();
        }
        commandEncoder.copyBufferToBuffer(this.voiBuffer, 0, this.voiBufferCopy, 0, this.numPoints * Float32Array.BYTES_PER_ELEMENT);
    }

}

export default CellVarGraph;