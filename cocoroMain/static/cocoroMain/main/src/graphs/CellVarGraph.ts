
import { renderCellVarGraphVertexShader, renderCellVarGraphFragmentShader, renderCellVarGraphComputeShader } from './CellVarGraphShaders';
import { CellObj } from '../helpers/interfaces';
import { GUI } from 'dat.gui';

abstract class CellVarGraph {
    // This abstract class inherits to a Cell and Tissue version for plotting in a 1D graph
    // cell level information in the cellular and tissue simulations. 
    // For rendering we needed a compute and render shaders, the former shift the values in time avoiding data races
    // by using a copy the 1D signal for updating the new signal to plot
    // and the second renders the 1D signal using line primitives
    
    device: GPUDevice;
    canvas: HTMLCanvasElement;
    textureFormat: GPUTextureFormat;
    gui: GUI;
    nNodes   : number;
    numPoints: number;
    min: number;
    max: number;
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
    cellObj             : CellObj;
    workgroupSize       : number;
    computeBindGroup: GPUBindGroup | null = null;
    statesBuffer: GPUBuffer | null = null;
    computeBindGroupEntries : GPUBindGroupEntry[];

    constructor(device: GPUDevice, canvas: HTMLCanvasElement, textureFormat: GPUTextureFormat, cellObj:CellObj, nNodes:number, gui:GUI, workgroupSize:number=64) {
        this.device = device;
        this.textureFormat = textureFormat;
        this.canvas        = canvas;
        this.gui           = gui;
        this.cellObj       = cellObj;
        this.nNodes        = nNodes;
        this.workgroupSize = workgroupSize;

        // Init gui based attributes
        const minController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "min")
        if (minController === undefined){ throw Error(`GUI controller min not found!`)}
        this.min = minController.getValue();
        minController.onChange((value) => {this.min = value;});

        const maxController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "max")
        if (maxController === undefined){ throw Error(`GUI controller max not found!`)}
        this.max = maxController.getValue();
        maxController.onChange((value) => {this.max = value;});

        const varNameController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "var_name")
        if (varNameController === undefined){ throw Error(`GUI controller var_name not found!`)}
        this.varName = varNameController.getValue();
        // varNameController.onChange((value) => {this.varName = value;}); not necessary this does not change once the computing is up
        
        const numPointsController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "num_points")
        if (numPointsController === undefined){ throw Error(`GUI controller num_points not found!`)}
        this.numPoints = numPointsController.getValue();
        // numPointsController.onChange((value) => {this.numPoints = value;}); not necessary this does not change once the computing is up

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
        
        this.xCoordsBuffer = this.device.createBuffer({
            label: "CellVarGraph_xCoordsBuffer",
            size: xcoords.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.xCoordsBuffer, 0, xcoords);
        
        this.voiBuffer = this.device.createBuffer({
            label: "CellVarGraph_voiBuffer",
            size: voiInitValues.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.voiBuffer, 0, voiInitValues);

        // this avoids dara race
        this.voiBufferCopy = this.device.createBuffer({
            label: "CellVarGraph_voiBufferCopy",
            size: voiInitValues.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.voiBufferCopy, 0, voiInitValues);

        this.indexBuffer = this.device.createBuffer({
            label: 'CellVarGraph_indexBuffer',
            size: indexs.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.indexBuffer, 0, indexs);

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


        this.computeBindGroupEntries = [
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
                    buffer: this.visualParamsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * 2,  //min and max
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: this.voiBufferCopy,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.numPoints,
                },
            },
            {
                binding: 3,
                resource: {
                    buffer: this.nodeIdxBuffer,
                    offset: 0,
                    size: Uint32Array.BYTES_PER_ELEMENT,
                },
            }
        ];
    

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

        this.computeBindGroupEntries.push({
            binding: this.computeBindGroupEntries.length,
            resource: {
                buffer: this.statesBuffer,
                offset: 0,
                size: statesByteLength,
            },
        });

        this.computeBindGroup = this.device.createBindGroup({
            label: 'CellVarGraph_ComputeBindGroup',
            layout: this.computePipeline.getBindGroupLayout(0),
                entries: this.computeBindGroupEntries,
        });
    }


    render(commandEncoder: GPUCommandEncoder){

        this.device.queue.writeBuffer(
            this.visualParamsBuffer,
            0,
            new Float32Array([
                this.min,   
                this.max
            ])
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