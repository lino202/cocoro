import { renderPECGGraphFragmentShader, renderPECGGraphVertexShader } from './PECGGraphShaders';
import { computePECGGraphShader1, computePECGGraphShader2, computePECGGraphShader3, computePECGGraphShader4 } from './PECGGraphShaders';
import { createGPUBuffer, createGPUBufferUint} from '../helpers/helper';
import { GUI } from 'dat.gui';
import { cellObj } from '../helpers/manageCellModelGUI';
import { meshObj, electrodesObj } from '../helpers/helper';

class PECGGraph {

    device: GPUDevice;
    canvas: HTMLCanvasElement;
    textureFormat: GPUTextureFormat;
    gui: GUI;
    numPoints: number;
    min: number;
    max: number;
    context: GPUCanvasContext;
    renderPipeline: GPURenderPipeline;
    computePipeline2: GPUComputePipeline;
    computePipeline3: GPUComputePipeline;
    computePipeline4: GPUComputePipeline;
    renderPassDescriptor: GPURenderPassDescriptor;
    numberOfIndexes             : number;
    coordsBuffer                : GPUBuffer;
    indexBuffer                 : GPUBuffer;
    voiBuffer                   : GPUBuffer;
    voiBufferCopy               : GPUBuffer; //avoids data race on shader invocations
    meshData                    : meshObj;
    electrodesData              : electrodesObj;
    nNodes                      : number;
    workgroupSize               : number;
    maxWorkgroupSize            : number;
    cellObj                     : cellObj;
    numPotentials               : number;
    numECGLeads                 : number;
    gradInvRBuffer              : GPUBuffer;
    integBuffer                 : GPUBuffer;
    potentialBuffer             : GPUBuffer;
    visualParamsBuffer          : GPUBuffer;
    smoothingBuffer             : GPUBuffer;
    potentialPerWorkgroupBuffer : GPUBuffer;
    statesBuffer: GPUBuffer | null = null;
    computeBindGroup2: GPUBindGroup | null = null;
    computeBindGroup3: GPUBindGroup;
    computeBindGroup4: GPUBindGroup;
    nWorkgroupsComputeShader2   : number;

    constructor(device: GPUDevice, canvas: HTMLCanvasElement, textureFormat: GPUTextureFormat, cellObj:cellObj,
                meshData:meshObj, electrodesData:electrodesObj, nNodes:number, adapterLimits:GPUSupportedLimits, gui:GUI, workgroupSize:number=64) {
        this.device = device;
        this.textureFormat = textureFormat;
        this.canvas = canvas;
        this.gui = gui;
        this.min = gui.__folders.Visualization.__controllers[0].getValue();
        this.max = gui.__folders.Visualization.__controllers[1].getValue();
        this.numPoints = gui.__folders.Visualization.__controllers[2].getValue();
        this.meshData = meshData;
        this.electrodesData = electrodesData;
        this.nNodes    = nNodes;
        this.workgroupSize = workgroupSize;
        this.maxWorkgroupSize = adapterLimits.maxComputeInvocationsPerWorkgroup;
        this.cellObj = cellObj;
        this.numPotentials = 10;
        this.numECGLeads   = 12;

        if (this.electrodesData.actual_points.length == 0){
            throw new Error(`The electrodes positions are null for this mesh`)
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
        
        const renderBuffers : GPUVertexBufferLayout[] = [
            {
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                attributes: [
                    {
                        //X-Y coordinates for 12 spaced lines
                        shaderLocation: 0,
                        format: "float32x2",
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


        this.renderPipeline = this.device.createRenderPipeline({
            label: 'PECGGraph_RenderPipeline',
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({                    
                    code: renderPECGGraphVertexShader
                }),
                entryPoint: "vs_main",
                buffers: renderBuffers
            },
            fragment: {
                module: this.device.createShaderModule({                    
                    code: renderPECGGraphFragmentShader
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
            label: 'PECGGraph_RenderPassDescriptor',
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                clearValue: { r: 0.3, g: 0.2, b: 0.4, a: 1.0 }, //background color
                loadOp: 'clear' as GPULoadOp,
                storeOp: 'store' as GPUStoreOp
            }],
        };

        // INIT - COMPUTE, we need 3 compute shaders:--------------------------------------------------------------
        // 1- is computed only once for getting grad 1/r, which is equal to - (r_vec - r'_vec) / r^3 where r is the magnitude |r_vec - r'_vec| and r_vec is 
        // lead position and r'_vec is the node position 
        // 2- for the extracellular potential on the electrode this is computed in every iteration (according to plot_dt) as Vm changes
        // 3- we need to then sum all values computed for each lead, this can not be done in shader 2 due to data races
        // 4- the other for the computation of the 12 lead electrocardiographic potential and moving the values for rendering the graph

        // First compute shader
        const gradInvRArr  = new Float32Array(this.nNodes*this.numPotentials*3).fill(0);
        this.gradInvRBuffer = this.device.createBuffer({
            label: 'PECGGraph_gradInvRBuffer',
            size: Float32Array.BYTES_PER_ELEMENT * gradInvRArr.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.gradInvRBuffer, 0, gradInvRArr);

        this.computeGradRInvArr()

        // Compute shader 2
        // now we have grad 1/r in gradInvRBuffer

        // We need to know the limits of invocations per workgroup of the current gpu to synchronously get the sum (integral)
        // of the pecg equation's integrand AVOIDING data races but MINIMAZING the length of the arrays in potentialPerWorkgroupBuffer.
        // In this way we make the for-loops that sum the final extracellular potential in compute shader 3 as short as our hardware enables it. 

        // Now we need to know the maxWorkGroupSize we can use, this number will generate maxWorkGroupSize * 40 bytes (10 potentials using 4 bytes each)
        // of storage in the workgroups and we are limited by maxComputeWorkgroupStorageSize -> so we calculate the higher maxWorkGroupSize that will 
        // not violate this storage size limitation and compute the largest power of 2 that is lower or equal than this maxWorkGroupSize, if this is lower than
        // maxComputeInvocationsPerWorkgroup we use t

        var maxWorkgroupSizePerMemory = Math.floor(adapterLimits.maxComputeWorkgroupStorageSize / (Float32Array.BYTES_PER_ELEMENT * this.numPotentials));
        if (maxWorkgroupSizePerMemory<this.maxWorkgroupSize){
            // this computes the power of two <= to the maxWorkgroupSizePerMemory, we need maxWorkgroupSize to be a power of 2 in order 
            // to sum all values in the workgroup, cause if we have a current_size (see compute shader 2) that is odd we will not sum 
            // the last elem in the array.
            this.maxWorkgroupSize = 1 << (Math.floor(Math.log2(maxWorkgroupSizePerMemory)));
        }
        

        this.nWorkgroupsComputeShader2 = Math.ceil(this.nNodes / this.maxWorkgroupSize);
        this.potentialPerWorkgroupBuffer = this.device.createBuffer({
            label: 'PECGGraph_potentialBuffer',
            size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials * this.nWorkgroupsComputeShader2,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.potentialPerWorkgroupBuffer, 0, new Float32Array(this.numPotentials*this.nWorkgroupsComputeShader2).fill(0));

        // not init here as this should be cleared every iteration
        this.potentialBuffer = this.device.createBuffer({
            label: 'PECGGraph_potentialBuffer',
            size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.potentialBuffer, 0, new Float32Array(this.numPotentials).fill(0));

        const integArr  = new Float32Array([this.meshData.dx]);
        this.integBuffer = this.device.createBuffer({
            label: 'PECGGraph_integBuffer',
            size: Float32Array.BYTES_PER_ELEMENT * integArr.length,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.integBuffer, 0, integArr);

        const visualParamsArray = new Float32Array([this.min, this.max]);
        this.visualParamsBuffer = this.device.createBuffer({
            label: "PECGGraph_VisualParamsBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;

        this.smoothingBuffer = this.device.createBuffer({
            label: "PECGGraph_smoothingBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * 1,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;

        const indexs          = this.getIndexesFor12Leads();   //This is the same for all 12 lines
        const coords          = this.getXYCoords();
        const voiInitValues   = new Float32Array(this.numPoints * this.numECGLeads).fill(0);
        this.numberOfIndexes  = indexs.length;
        this.coordsBuffer     = createGPUBuffer(this.device, coords);
        this.indexBuffer      = createGPUBufferUint(this.device, indexs);
        this.voiBuffer        = createGPUBuffer(this.device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
        this.voiBufferCopy = this.device.createBuffer({
            label: "PECGGraph_voiBufferCopy",
            size: Float32Array.BYTES_PER_ELEMENT * voiInitValues.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.voiBufferCopy, 0, voiInitValues);

        // console.log(computePECGGraphShader2(this.cellObj.cellModel, this.nNodes, this.meshData.elementType, this.nWorkgroupsComputeShader2, this.maxWorkgroupSize));
        this.computePipeline2 = this.device.createComputePipeline({
            label: 'PECGGraph_ComputePipeline2',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: computePECGGraphShader2(this.cellObj.cellModel, this.nNodes, this.meshData.elementType, this.nWorkgroupsComputeShader2, this.maxWorkgroupSize)}),
                entryPoint: 'comp_main',
            },
        });

        // Compute shaders 3 and 4

        // console.log(computePECGGraphShader3(this.nWorkgroupsComputeShader2))
        this.computePipeline3 = this.device.createComputePipeline({
            label: 'PECGGraph_ComputePipeline3',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: computePECGGraphShader3(this.nWorkgroupsComputeShader2)}),
                entryPoint: 'comp_main',
            },
        });

        this.computeBindGroup3 = this.device.createBindGroup({
            label: 'PECGGraph_ComputeBindGroup3',
            layout: this.computePipeline3.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.potentialPerWorkgroupBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials * this.nWorkgroupsComputeShader2,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: this.potentialBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials,
                        },
                    }
                ],
        });

        // console.log(computePECGGraphShader4(this.numPoints))
        this.computePipeline4 = this.device.createComputePipeline({
            label: 'PECGGraph_ComputePipeline4',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: computePECGGraphShader4(this.numPoints)}),
                entryPoint: 'comp_main',
            },
        });

        this.computeBindGroup4 = this.device.createBindGroup({
            label: 'PECGGraph_ComputeBindGroup4',
            layout: this.computePipeline4.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.potentialBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: this.voiBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * voiInitValues.length,
                        },
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: this.visualParamsBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
                        },
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: this.voiBufferCopy,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * voiInitValues.length,
                        },
                    },
                    {
                        binding: 4,
                        resource: {
                            buffer: this.smoothingBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * 1,
                        },
                    }

                ],
        });
    }

    private getIndexesFor12Leads(): Uint32Array{
        const result = new Uint32Array((this.numPoints-1)*12*2);
        const indexes = this.getIndexesForLine();
        
        for( let i=0; i<12; i++){
            const addedArray = indexes.map((value) => value + i*this.numPoints);
            result.set(addedArray, i*indexes.length)
        }

        return result;
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
    
    private getXYCoords(): Float32Array{
        const coords = new Float32Array(this.numPoints*2*12);

        // Get the limits in x
        const totalSpacePerLine = 2/6;   //two rows six columns
        const separation = totalSpacePerLine * 2/100; //separation (init and finish) between lines
        const actualSpacePerLine = totalSpacePerLine - separation*2;
        
        for (let i=0; i<12; i++){

            var absoluteInit = 0;
            if ((i==0) || (i==6)){
                absoluteInit = -1 + separation;
            }else if ((i==1) || (i==7)){
                absoluteInit = -1 + actualSpacePerLine + 3*separation;
            }else if ((i==2) || (i==8)){
                absoluteInit = -1 + 2*actualSpacePerLine + 5*separation; 
            }else if ((i==3) || (i==9)){
                absoluteInit = separation; 
            }else if ((i==4) || (i==10)){
                absoluteInit = actualSpacePerLine + 3*separation; 
            }
            else if ((i==5) || (i==11)){
                absoluteInit = 2*actualSpacePerLine + 5*separation; 
            }

            const xy = new Float32Array(this.numPoints*2);
            for (let j=0; j<this.numPoints; j++) {
                xy[j*2] = ((j/this.numPoints) * actualSpacePerLine) + absoluteInit;

                if (i < 6) {
                    xy[j*2+1] = 0.5;  // top graphs 
                } else {
                    xy[j*2+1] = -0.5;  // bottom graphs
                }
            }

            coords.set(xy, xy.length*i)
        }

        return coords;
        
    }

    private computeGradRInvArr(): void{

        // Init buffers 
        const electrodesPosBuffer = this.device.createBuffer({
            label: "PECGGraph_electrodesPosBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.electrodesData.actual_points.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }) as GPUBuffer;
        
        const nodePosBuffer = this.device.createBuffer({
            label: "PECGGraph_nodePosBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.meshData.actual_points.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;

        // Set compute pipeline
        // console.log(computePECGGraphShader1(this.nNodes))
        const computePipeline1 = this.device.createComputePipeline({
            label: 'PECGGraph_ComputePipeline1',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: computePECGGraphShader1(this.nNodes)}),
                entryPoint: 'comp_main',
            },
        });

        const computeBindGroup1 = this.device.createBindGroup({
            label: 'PECGGraph_ComputeBindGroup1',
            layout: computePipeline1.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.gradInvRBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.nNodes*this.numPotentials*3,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: nodePosBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.meshData.actual_points.length,
                        },
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: electrodesPosBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.electrodesData.actual_points.length,
                        },
                    }
                ],
        });

        // Write Buffers
        this.device.queue.writeBuffer(nodePosBuffer, 0, this.meshData.actual_points);
        this.device.queue.writeBuffer(electrodesPosBuffer, 0, this.electrodesData.actual_points);

        // launch
        const commandEncoder = this.device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(computePipeline1);
        passEncoder.setBindGroup(0, computeBindGroup1);
        passEncoder.dispatchWorkgroups(Math.ceil(this.nNodes / this.workgroupSize));
        passEncoder.end();

        const gpuCommands = commandEncoder.finish();
        this.device.queue.submit([gpuCommands]);

    }

    setStatesBuffer(statesBuffer:GPUBuffer, statesByteLength:number){
        
        this.statesBuffer = statesBuffer;

        if (this.meshData.elementType == 'line'){
            this.computeBindGroup2 = this.device.createBindGroup({
                label: 'PECGGraph_ComputeBindGroup2',
                layout: this.computePipeline2.getBindGroupLayout(0),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.potentialPerWorkgroupBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials * this.nWorkgroupsComputeShader2,
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
                                buffer: this.gradInvRBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * this.nNodes*this.numPotentials*3,
                            },
                        },
                        {
                            binding: 3,
                            resource: {
                                buffer: this.integBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * 1,
                            },
                        }
                    ],
            });
    
        }else if ((this.meshData.elementType == 'quad') || (this.meshData.elementType == 'hexa')){

            const connectionsArray  = new Uint32Array(Object.values(this.meshData.connections));
            const connectionsBuffer = this.device.createBuffer({
                size: Uint32Array.BYTES_PER_ELEMENT * connectionsArray.length,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });

            this.computeBindGroup2 = this.device.createBindGroup({
                label: 'PECGGraph_ComputeBindGroup2',
                layout: this.computePipeline2.getBindGroupLayout(0),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.potentialPerWorkgroupBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * this.numPotentials * this.nWorkgroupsComputeShader2,
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
                                buffer: this.gradInvRBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * this.nNodes*this.numPotentials*3,
                            },
                        },
                        {
                            binding: 3,
                            resource: {
                                buffer: this.integBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * 1,
                            },
                        },
                        {
                            binding: 4,
                            resource: {
                                buffer: connectionsBuffer,
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * connectionsArray.length,
                            },
                        }
                    ],
            });

            this.device.queue.writeBuffer(connectionsBuffer, 0, this.meshData.connections);
    

        }else{
            throw new Error(`Element type ${this.meshData.elementType} not supported`)
        }

        
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

        this.device.queue.writeBuffer(
            this.smoothingBuffer,
            0,
            new Float32Array([this.gui.__folders.Visualization.__controllers[3].getValue()])
        );

        {   //Compute Update
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline2);
            passEncoder.setBindGroup(0, this.computeBindGroup2);
            passEncoder.dispatchWorkgroups(this.nWorkgroupsComputeShader2);
            passEncoder.end();
        }
        {   //Compute Update
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline3);
            passEncoder.setBindGroup(0, this.computeBindGroup3);
            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();
        }
        {   //Compute Update
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline4);
            passEncoder.setBindGroup(0, this.computeBindGroup4);
            passEncoder.dispatchWorkgroups(Math.ceil((this.numPoints * this.numECGLeads) / this.workgroupSize));
            passEncoder.end();
        }
        {   //Render Update
            const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
            colorAttachments[0].view = this.context.getCurrentTexture().createView();
    
            const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
            passEncoder.setPipeline(this.renderPipeline);
            passEncoder.setVertexBuffer(0, this.coordsBuffer);
            passEncoder.setVertexBuffer(1, this.voiBuffer);
            passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
            passEncoder.drawIndexed(this.numberOfIndexes);
            passEncoder.end();
        }
        commandEncoder.copyBufferToBuffer(this.voiBuffer, 0, this.voiBufferCopy, 0, this.numPoints * this.numECGLeads * Float32Array.BYTES_PER_ELEMENT);
    }

}

export default PECGGraph;