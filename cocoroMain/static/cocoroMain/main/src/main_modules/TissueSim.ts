import Simulation from './Simulation';
import GraphsRenderer from '../graphs/GraphsRenderer';
import MouseStimHandler from '../io/mouseStimHandler';
import { MeshObj, CellObj, ElectrodesObj, ViewProjection, LightInputsInterface } from '../helpers/interfaces';
import { GUI } from 'dat.gui';
import { commonVertFragShaders } from '../tissue_shaders/commonVertFragShaders.js';
import { computeShaderMonodomainLine } from '../tissue_shaders/simLineMonodomainShader';
import { computeShaderMonodomainQuad } from '../tissue_shaders/simQuadMonodomainShader.js';
import { computeShaderMonodomainHexa } from '../tissue_shaders/simHexaMonodomainShader.js';
import { mat4 } from 'gl-matrix';
import { createViewProjection} from '../helpers/helper';
import Camera from "../io/mycamera";
import EnsightWriter from '../io/ensightWriter';


class TissueSim extends Simulation {
    // TissueSim is a class for generating simulators that simulate and RENDER a a tissue model, being this based on
    //  linea 2D (quads) or 3D (hexahedrons) meshes
    meshData       : MeshObj;
    numberOfIndexes: number;
    numberOfVertexs: number;
    stimParamsNum  : number;
    mouseStimActive: boolean;
    vpMatrix       : mat4 = mat4.create();
    camera         : any;
    ensightWriter  : EnsightWriter|undefined;
    min            : number;
    max            : number;

    // TODO The ideal would be that the ! is not needed but we need to wait until we have a gpu device
    // otherwise all code fordward would end in a error, as all values obtained in initGPU are undefined!
    computeBindGroupEntries!: GPUBindGroupEntry[];
    computePipeline!:         GPUComputePipeline;
    computeBindGroup!:        GPUBindGroup;
    renderBindGroupEntries!:  GPUBindGroupEntry[];
    renderPipeline!:          GPURenderPipeline;
    renderBindGroup!:         GPUBindGroup;
    renderPassDescription!:   any;
    graphsRenderer!:          GraphsRenderer;
    mouseStim!:               MouseStimHandler;
    vertexRenderBuffer!:      GPUBuffer;
    vertexBuffer!:            GPUBuffer;
    normalBuffer!:            GPUBuffer;
    indexBuffer!:             GPUBuffer;
    vmBuffer!:                GPUBuffer;
    vmBufferCopy!:            GPUBuffer;
    vp!:                      ViewProjection;

    // From here these arrays are undefined under certain elem types
    fiberOrientationArray!:   Float32Array;
    connectionsArray!:        Uint32Array;
    fiberOrientationBuffer!:  GPUBuffer;
    connectionsBuffer!:       GPUBuffer;
    vmArrayVertexs!:          Float32Array;
    renderPointsArray!:       Uint32Array;
    renderPointsBuffer!:      GPUBuffer;
    fragmentUniformBuffer!:   GPUBuffer;
    colorUniformBuffer!:      GPUBuffer;
    lightUniformBuffer!:      GPUBuffer;
    vmVertexsBuffer!:         GPUBuffer;
    eyePosition!:             Float32Array;

    // Light used in case of hexa elem type
    light: LightInputsInterface = {
        color: '0.0, 1.0, 0.0',
        ambientIntensity: '0.2',
        diffuseIntensity: '0.8',
        specularIntensity: '0.2',
        shininess: '30.0',
        specularColor: '1.0, 1.0, 1.0',
        isTwoSideLighting: '1.0',
    };

    // Private constructor as we use the static create for instantiating this class
    private constructor(meshData:MeshObj, gui:GUI, cellObj:CellObj, mouseStimActive:boolean, ensightWriter:EnsightWriter|undefined) {
        super(gui, cellObj);
        this.meshData = meshData;
        this.integ.dx = this.meshData.dx;
        this.mouseStimActive = mouseStimActive;
        this.ensightWriter = ensightWriter;

        // Some Info
        console.log(`TISSUE SIMULATION --------------------------------------------`);
        console.log(`Mesh elem: ${this.meshData.elementType}`);
        console.log(`Cell model: ${this.cellObj.cellModel}`);

        this.readAndUpdateGUI();

        // Init gui based attributes
        const minController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "min")
        if (minController === undefined){ throw Error(`GUI controller min not found!`)}
        this.min = minController.getValue();
        minController.onChange((value) => {this.min = value;});

        const maxController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "max")
        if (maxController === undefined){ throw Error(`GUI controller max not found!`)}
        this.max = maxController.getValue();
        maxController.onChange((value) => {this.max = value;});

        // we update our arrays and create the buffers with right sizes
        this.numberOfIndexes   = this.meshData.render_elems.length;
        this.numberOfVertexs   = Math.trunc(this.meshData.vertexs.length / 3);
        this.nNodes            = Math.trunc(this.meshData.actual_points.length / 3); // For non hexa mesh this is equal to number of vertexs
        this.stimParamsNum     = Math.trunc(this.meshData.stim_params.length / this.nNodes);
        this.vmArray           = new Float32Array(this.nNodes).fill(this.cellObj.states.vm);
        this.stimArray         = this.meshData.stim_params;
        this.statesArray       = this.repeatFloat32Array(new Float32Array(Object.values(this.cellObj.states)),this.nNodes)
        this.constantsArray    = new Float32Array(Object.values(this.cellObj.constants))
        this.integrationArray  = new Float32Array([this.integ.dt, this.integ.dx])
        this.visualParamsArray = new Float32Array([this.min, this.max]);

        if ((meshData.elementType == 'quad') || (meshData.elementType == 'hexa')){
            this.fiberOrientationArray = new Float32Array(Object.values(this.meshData.fibers_long));
            this.connectionsArray      = new Uint32Array(Object.values(this.meshData.connections));
        }

        if (meshData.elementType == 'hexa'){
            this.vmArrayVertexs    = new Float32Array(this.numberOfVertexs).fill(this.cellObj.states.vm);
            this.renderPointsArray = new Uint32Array(Object.values(this.meshData.render_points_global_ids));
        }

        // simulate is the method where the simulation (rendering and computation occurs) 
        // as we use requestAnimationFrame, the simulate methods looses the this context 
        // so we need to bind this method to the correct object/instance
        this.simulate = this.simulate.bind(this)

    }

    static async create(meshData:MeshObj, gui:GUI, cellObj:CellObj, ensightWriter:EnsightWriter|undefined, electrodesData:ElectrodesObj, guiCellVarGraph:GUI, guiPECGGraph:GUI, mouseStimActive:boolean): Promise<TissueSim> {
        const simulator = new TissueSim(meshData, gui, cellObj, mouseStimActive, ensightWriter);
        await simulator.initGPU();

        // Once WE HAVE THE DEVICE we can compose simulator instance with other objects that require gpu objects such as mouse stimulation and graphs
        simulator.graphsRenderer = new GraphsRenderer(simulator.device, simulator.gpu_textureformat, simulator.gpu_extracanvases, simulator.gpu_limits,
                                                                    simulator.cellObj, simulator.meshData, electrodesData, guiCellVarGraph, guiPECGGraph);
        if (simulator.mouseStimActive){
                simulator.mouseStim = new MouseStimHandler(simulator.device, simulator.meshData, simulator.gpu_canvas, simulator.gpu_limits);
        }

        // init some common buffers to cell sim
        simulator.initBuffers();

        // ATTENTION, the stim buffer is init on parent's method initBuffers as this is shared with CellSim but 
        // for now in the TissueSim the user cannot change the stim variables, e.g, amp, dur, etc so we not rewrite the buffer on simulate() (as in CellSim)
        // BUT we need to initialize it so we do it here. I do it here in order to have more visibility of this, which would change if we enable the user to 
        // alter prefixed stimulation values (not the region but its values amp, dur, etc)
        simulator.device.queue.writeBuffer(simulator.stimBuffer, 0, simulator.meshData.stim_params);

        // The states array is already init and filled so we can passed it to the graphs
        simulator.graphsRenderer.setStatesBuffer(simulator.statesBuffer, Float32Array.BYTES_PER_ELEMENT * simulator.statesArray.length);
    
        // init buffers
        simulator.initTissueBuffers();

        // Init the render pipeline, this renders the mesh and its simulation, do not confuse with the graphs renders
        simulator.initRendering();

        // Init the computation pipeline, this makes the calculations :P
        simulator.initComputing();

        return simulator;
    }

    private repeatFloat32Array(arr: Float32Array, n: number): Float32Array {
        const concatenatedArray = new Float32Array(arr.length * n);
    
        for (let i=0; i<n;i++){
            concatenatedArray.set(arr, i*arr.length);    
        }
    
        return concatenatedArray;
    }

    private initTissueBuffers(){

        // Init common buffers to all elem types

        // Buffer for sending spatial matrixes from camera to update position from mouse
        this.vertexRenderBuffer = this.device.createBuffer({
            label: 'TissueSim_vertexRenderBuffer',
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        
        this.vertexBuffer = this.device.createBuffer({
            label: 'TissueSim_vertexBuffer',
            size: this.meshData.vertexs.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.meshData.vertexs);
        
        this.normalBuffer = this.device.createBuffer({
            label: 'TissueSim_normalBuffer',
            size: this.meshData.normals.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.normalBuffer, 0, this.meshData.normals);

        this.indexBuffer = this.device.createBuffer({
            label: 'TissueSim_indexBuffer',
            size: this.meshData.render_elems.length * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.indexBuffer, 0, this.meshData.render_elems);

        //This saves ALL (not only on the render mesh vertexs) vms for having a continguous buffer to copy
        this.vmBuffer = this.device.createBuffer({
            label: 'TissueSim_vmBuffer',
            size: this.vmArray.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.vmBuffer, 0, this.vmArray);

        //This saves ALL (not only on the render mesh vertexs) vms for reading values in spatial derivatives computation and avoid data races
        this.vmBufferCopy = this.device.createBuffer({
            label: 'TissueSim_vmBufferCopy',
            size: this.vmArray.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.vmBufferCopy, 0, this.vmArray);

        
        // Extra buffers for quad and hexa
        if ((this.meshData.elementType == 'quad') || (this.meshData.elementType == 'hexa')){
            
            this.fiberOrientationBuffer = this.device.createBuffer({
                size: Float32Array.BYTES_PER_ELEMENT * this.fiberOrientationArray.length,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.fiberOrientationBuffer, 0, this.fiberOrientationArray);
            
            this.connectionsBuffer = this.device.createBuffer({
                size: Uint32Array.BYTES_PER_ELEMENT * this.connectionsArray.length,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.connectionsBuffer, 0, this.connectionsArray);
        }

        if (this.meshData.elementType == 'hexa'){
            this.renderPointsBuffer = this.device.createBuffer({
                size: Uint32Array.BYTES_PER_ELEMENT * this.renderPointsArray.length,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.renderPointsBuffer, 0, this.renderPointsArray);

            this.fragmentUniformBuffer = this.device.createBuffer({
                size: 32,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.colorUniformBuffer = this.device.createBuffer({    //buffer of 32 bytes with 16 for light color vector and the rest 16 bytes for specular color 
                size: 32,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.colorUniformBuffer, 0, new Float32Array(this.light.color?.split(',').map(Number)!));
            this.device.queue.writeBuffer(this.colorUniformBuffer, 16, new Float32Array(this.light.specularColor?.split(',').map(Number)!));

            // get realiable light parameters and associated with the correct buffer and passed to the device
            this.lightUniformBuffer = this.device.createBuffer({    
                size: 20,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const lightParams = new Float32Array([
                parseFloat(this.light.ambientIntensity?.toString()!),
                parseFloat(this.light.diffuseIntensity?.toString()!),
                parseFloat(this.light.specularIntensity?.toString()!),
                parseFloat(this.light.shininess?.toString()!),
                parseFloat(this.light.isTwoSideLighting?.toString()!),
            ]);
            this.device.queue.writeBuffer(this.lightUniformBuffer, 0, lightParams);

            //This saves only vms of the render mesh vertexs for rendering
            this.vmVertexsBuffer = this.device.createBuffer({    
                size: Float32Array.BYTES_PER_ELEMENT * this.vmArrayVertexs.length,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.vmVertexsBuffer, 0, this.vmArrayVertexs);
        }
    }

    private setRenderingBindings(){

        // Common bindings
        this.renderBindGroupEntries = [
            {
                binding: 0,
                resource: {
                    buffer: this.vertexRenderBuffer,
                    offset: 0,
                    size: 64
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: this.visualParamsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.visualParamsArray.length
                }
            }
        ];

        // Add in case of hexa 
        if (this.meshData.elementType == 'hexa'){
            this.renderBindGroupEntries.push({
                binding: this.renderBindGroupEntries.length,
                resource: {
                    buffer: this.fragmentUniformBuffer,
                    offset: 0,
                    size: 32,
                }
            });
            this.renderBindGroupEntries.push({
                binding: this.renderBindGroupEntries.length,
                resource: {
                    buffer: this.colorUniformBuffer,
                    offset: 0,
                    size: 32,
                }
            });
            this.renderBindGroupEntries.push({
                binding: this.renderBindGroupEntries.length,
                resource: {
                    buffer: this.lightUniformBuffer,
                    offset: 0,
                    size: 20,
                }
            });
        }

    }


    private initRendering(){

        this.setRenderingBindings();

        var topology:GPUPrimitiveTopology = "triangle-list";
        if (this.meshData.elementType == 'line'){
            topology = "line-list";
        }

        this.renderPipeline = this.device.createRenderPipeline({
            label: 'TissueSim_renderPipeline',
            layout: 'auto',
            vertex: {
                module: this.device.createShaderModule({                    
                    code:  commonVertFragShaders(this.meshData.elementType)
                }),
                entryPoint: "vs_main",
                buffers:[
                    {
                        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                        attributes: [
                            {
                                //Vertex positions
                                shaderLocation: 0,
                                format: "float32x3",
                                offset: 0
                            }
                        ]
                    },
                    {
                        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                        attributes: [
                            {
                                //Vertex normals
                                shaderLocation: 1,
                                format: "float32x3",
                                offset: 0
                            }
                        ]
                    },
                    {
                        arrayStride: Float32Array.BYTES_PER_ELEMENT,
                        attributes: [
                            {
                                //Vertex Vm shared with compute shader -> vmBuffer or vmVertexsBuffer
                                shaderLocation: 2,
                                format: "float32",
                                offset: 0
                            }
                        ]
                    }
                ]
            },
            fragment: {
                module: this.device.createShaderModule({                    
                    code:  commonVertFragShaders(this.meshData.elementType)
                }),
                entryPoint: "fs_main",
                targets: [
                    {
                        format: this.gpu_textureformat as GPUTextureFormat
                    }
                ]
            },
            primitive:{
                
                topology: topology,
                // cullMode: 'back'
            },
            depthStencil:{
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });

        // create render uniform data (for camera control and visualization) and add camera
        // https://learnopengl.com/Getting-started/Coordinate-Systems
        this.vp     = createViewProjection(this.gpu_canvas.width/this.gpu_canvas.height);
        this.camera = Camera(this.gpu_canvas, this.vp.cameraOption);
        this.eyePosition = new Float32Array(this.vp.cameraOption.eye);  // this is only use with hexa elem type

        this.renderBindGroup = this.device.createBindGroup({
            label: 'TissueSim_renderBindGroup',
            layout: this.renderPipeline.getBindGroupLayout(0),
            entries: this.renderBindGroupEntries
        });

        let textureView = this.gpu_context.getCurrentTexture().createView();
        const depthTexture = this.device.createTexture({
            size: [this.gpu_canvas.width, this.gpu_canvas.height, 1],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        
        this.renderPassDescription = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.5, g: 0.5, b: 0.8, a: 1.0 }, //background color
                loadOp: "clear",
                storeOp: "store"
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
            }
        };

    }

    private setComputingBindings(){

        // The common bindings, this is the minimum required and they are for the line case
        this.computeBindGroupEntries = [
            {
                binding: 0,
                resource: {
                    buffer: this.vmBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.vmArray.length,
                },
            },
            {
                binding: 1,
                resource: {
                    buffer: this.stimBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.nNodes * this.stimParamsNum,
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: this.statesBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.statesArray.length,
                },
            },
            {
                binding: 3,
                resource: {
                    buffer: this.constantsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.constantsArray.length,
                },
            },
            {
                binding: 4,
                resource: {
                    buffer: this.integBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.integrationArray.length,
                },
            },
            {
                binding: 5,
                resource: {
                    buffer: this.vmBufferCopy,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.vmArray.length,
                },
            },
        ];


        // Add in case of quad or hexa 
        if ((this.meshData.elementType == 'quad') || (this.meshData.elementType == 'hexa')){
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.fiberOrientationBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.fiberOrientationArray.length,
                }
            });
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.connectionsBuffer,
                    offset: 0,
                    size: Uint32Array.BYTES_PER_ELEMENT * this.connectionsArray.length,
                }
            })
        }

        if (this.meshData.elementType == 'hexa'){
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.vmVertexsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.vmArrayVertexs.length,
                }
            });
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.renderPointsBuffer,
                    offset: 0,
                    size: Uint32Array.BYTES_PER_ELEMENT * this.renderPointsArray.length,
                }
            })
        
        
        }

    }

    private initComputing(){

        // Set the computing bindings
        this.setComputingBindings();

        // Instantiate the computing pipeline and create the shader
        var computeShader:string;
        if (this.meshData.elementType == 'line'){
            computeShader = computeShaderMonodomainLine(this.cellObj.cellModel, this.nNodes, this.workgroup_size, this.saveStart, this.debugStart, this.debugStateName, this.mouseStimActive, this.computeBindGroupEntries.length);
        }else if (this.meshData.elementType == 'quad'){
            computeShader = computeShaderMonodomainQuad(this.cellObj.cellModel, this.nNodes, this.workgroup_size, this.saveStart, this.debugStart, this.debugStateName, this.mouseStimActive, this.computeBindGroupEntries.length);
        }else if (this.meshData.elementType == 'hexa'){
            computeShader = computeShaderMonodomainHexa(this.cellObj.cellModel, this.nNodes, this.numberOfVertexs, this.workgroup_size, this.saveStart, this.debugStart, this.debugStateName, this.mouseStimActive, this.computeBindGroupEntries.length)
        }else{
            throw Error(`Wrong elem type ${this.meshData.elementType} on mesh!`)
        }


        console.log(computeShader);
        this.computePipeline = this.device.createComputePipeline({
            label: 'TissueSim_computePipeline',
            layout: 'auto',
            compute: {
            module: this.device.createShaderModule({
                code: computeShader,
            }),
            entryPoint: 'comp_monodomain_main',
            },
        });

        // Add save or debug and mouse stim to computing bindings
        this.saveOrDebug();
        if (this.mouseStimActive ){
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.mouseStim.mouseStimBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.mouseStim.nNodes,
                },
            });        
        }

        // Once you finished adding the bindings you create the bind group
        this.computeBindGroup = this.device.createBindGroup({
            label: 'TissueSim_computeBindGroup',
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: this.computeBindGroupEntries,
        });

    }


    async simulate(){
        this.stats.begin();

        // Update camera
        if(this.camera.tick()){
            // Just to clarify, here we left a few lines of code maybe harming clarity, so
            // we left some lines of the old code which specify which ones are the projection (p) 
            // and view (v) matrices -> compare with the lines left and read https://learnopengl.com/Getting-started/Coordinate-Systems
            // const pMatrix = vp.projectionMatrix;
            // vMatrix = camera.matrix;
            // mat4.multiply(vpMatrix, pMatrix, vMatrix);
            mat4.multiply(this.vpMatrix, this.vp.projectionMatrix, this.camera.matrix);
            this.device.queue.writeBuffer(this.vertexRenderBuffer, 0, this.vpMatrix as ArrayBuffer);


            if (this.meshData.elementType === 'hexa'){
                this.eyePosition = new Float32Array(this.camera.eye.flat());
                this.device.queue.writeBuffer(this.fragmentUniformBuffer, 0, this.eyePosition);       
                this.device.queue.writeBuffer(this.fragmentUniformBuffer, 16, this.eyePosition); //the light and eye position are the same, this seems ok as it is
            }

            // In case the mouse stim is set we need to update the view-projection matrix
            if (this.mouseStimActive){
                this.mouseStim.cameraUpdate(this.vpMatrix);
            }
            
        }

        // Do this here to change colors shown on pause
        this.device.queue.writeBuffer(this.visualParamsBuffer, 0, new Float32Array([this.min, this.max]));

        if (!this.integ.simulate) {
            // We render the for getting the camera changes
            const commandEncoder = this.device.createCommandEncoder();
            const textureView = this.gpu_context.getCurrentTexture().createView();
            this.renderPassDescription.colorAttachments[0].view = textureView;
            const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescription as GPURenderPassDescriptor);
            passEncoder.setPipeline(this.renderPipeline);
            passEncoder.setVertexBuffer(0, this.vertexBuffer);
            passEncoder.setVertexBuffer(1, this.normalBuffer);
            if (this.meshData.elementType === 'hexa'){
                passEncoder.setVertexBuffer(2, this.vmVertexsBuffer);
            }else{
                passEncoder.setVertexBuffer(2, this.vmBuffer);
            }
            passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
            passEncoder.setBindGroup(0, this.renderBindGroup);
            passEncoder.drawIndexed(this.numberOfIndexes);
            passEncoder.end();

            const gpuCommands = commandEncoder.finish();
            this.device.queue.submit([gpuCommands]);


            this.stats.end();
            requestAnimationFrame(this.simulate); // Keep looping but do nothing
            return;
        }

        //Update Params
        this.device.queue.writeBuffer(
            this.constantsBuffer,
            0,
            new Float32Array(Object.values(this.cellObj.constants))
        );
        this.device.queue.writeBuffer(
            this.integBuffer,
            0,
            new Float32Array([
                this.integ.simulate ? this.integ.dt : 0.0, // I think this is not necessary
                this.integ.dx  
              ])
        );
        
        // Create commandEncoder and add compute and render guidelines
        const iterations_per_plotdt = Math.ceil(this.plot_dt/this.integ.dt); //integ.dt might change
        const commandEncoder = this.device.createCommandEncoder();

        // Several Compute Updates
        for(let i=0; i<iterations_per_plotdt; i++){
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline);
            passEncoder.setBindGroup(0, this.computeBindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(this.nNodes / this.workgroup_size));
            passEncoder.end();
            commandEncoder.copyBufferToBuffer(this.vmBuffer, 0, this.vmBufferCopy, 0, this.vmArray.byteLength);  // This avoids data race 
        }
        // One render update
        {
            const textureView = this.gpu_context.getCurrentTexture().createView();
            this.renderPassDescription.colorAttachments[0].view = textureView;
            const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescription as GPURenderPassDescriptor);
            passEncoder.setPipeline(this.renderPipeline);
            passEncoder.setVertexBuffer(0, this.vertexBuffer);
            passEncoder.setVertexBuffer(1, this.normalBuffer);
            if (this.meshData.elementType === 'hexa'){
                passEncoder.setVertexBuffer(2, this.vmVertexsBuffer);
            }else{
                passEncoder.setVertexBuffer(2, this.vmBuffer);
            }
            passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
            passEncoder.setBindGroup(0, this.renderBindGroup);
            passEncoder.drawIndexed(this.numberOfIndexes);
            passEncoder.end();
        }

        // Add render pass for possible new canvases
        if (this.graphsRenderer.isActivated) {
            this.graphsRenderer.render(commandEncoder)
        }
        
        // in case the user wanted to save or debug we need to say it to the gpu
        this.copyInfoFromGPU(commandEncoder);

        // submit for ACTION
        this.device.queue.submit([commandEncoder.finish()]);

        // Get info to the CPU and print it or save it
        // The save data is particular for cell or tissue
        if (this.integ.simulation_time >= this.saveStart && this.stepsCount <= this.totalStepsToSave-1 && this.integ.simulate && this.ensightWriter != undefined) {
            
            // Get the data from the gpu
            await this.readSaveBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = this.readSaveBuffer.getMappedRange();

            // Generate the wildcard string for the ensight file
            const wildcardString = this.stepsCount.toString().padStart(this.totalStepsToSave.toString().length, '0');
            
            // Save dynamically
            this.ensightWriter.saveStates(arrayBuffer, wildcardString);
            
            this.savedSimulation = true;
            this.stepsCount++;
        }
        if (this.stepsCount > this.totalStepsToSave-1 && this.savedSimulation && this.ensightWriter != undefined) {
            this.savedSimulation = false;
            // Save geometry and case for ensight
            this.ensightWriter.saveGeometry(this.meshData);
            this.ensightWriter.saveAnimation(this.totalStepsToSave, this.plot_dt, this.saveStart);

            console.log('Animation saved as: ', this.ensightWriter.animationFileName);
            console.log('Geometry saved as: ', this.ensightWriter.geometryFileName);
            console.log('States saved as: ', this.ensightWriter.statesFileName + '*.ens');
        } 

        // We need to await for the buffer to get read
        await this.handleDebugInfoInCPU();

        // Update simulation time
        this.integ.simulation_time += this.integ.dt * iterations_per_plotdt;

        this.stats.end();

        // Keep going...
        requestAnimationFrame(this.simulate);
    }

}


export default TissueSim;