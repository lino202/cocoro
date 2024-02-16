import { createTransforms, createViewProjection, meshObj} from '../helpers/helper';
import { createGPUBufferUint, createGPUBuffer, initGPU, repeatFloat32Array } from '../helpers/helper';
import { cellObj } from '../helpers/manageCellModelGUI';
import { commonVertFragShaders } from '../tissue_shaders/commonVertFragShaders.js';
import { computeShaderMonodomainSurfDiffusion, computeShaderMonodomainSurfReaction, computeShaderMonodomainSurfUpdateVmFromDifussion } from '../tissue_shaders/simSurfMonodomainShaderParts.js';
import { mat4, vec3 } from 'gl-matrix';
import { GUI } from 'dat.gui';
import Stats from "stats.js";

const createCamera =require('3d-view-controls')


// This simulates line without Light as it is not neccessary
// Voi refers to Variable of interest
export const SimSurfMonodomainParts = async (gui:GUI, meshData:meshObj, cellObj:cellObj) => {
    
    
    console.log("RENDERING AND SIMULATING SURFACE");
    console.log("SIMULATING CELL MODEL:");
    console.log(cellObj.cellModel)
    // const debug_init_time:number = 74;
    
    var stats = new Stats();
    stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
    document.body.appendChild( stats.dom );

    const gpu = await initGPU();
    const device = gpu.device;
    
    const integ = {
        simulate: true,
        dt : 0.01,     //[ms]
        dx : 100,     //Mesh edglength [um] 
        simulation_time : 0,
        debug_init_time : 100000
    }
    const integFolder = gui.addFolder('Integration');
    Object.keys(integ).forEach((k) => {
        if (k=="simulation_time"){
            integFolder.add(integ, k).listen();
        }else{
            integFolder.add(integ, k);
        } 
    });

    var plot_dt = gui.__folders.Visualization.__controllers[2].getValue();

    // create arrays and buffers
    const numberOfIndexes  = meshData.render_elems.length;
    const numberOfVertices = Math.trunc(meshData.vertexs.length / 3);
    const stimParamsNum    = Math.trunc(meshData.stim_params.length / numberOfVertices);
    const voiInitValues    = new Float32Array(numberOfVertices);
    voiInitValues.fill(cellObj.states.vm); //TODO scale this here

    const statesArray       = repeatFloat32Array(new Float32Array(Object.values(cellObj.states)),numberOfVertices);
    const constantsArray    = new Float32Array(Object.values(cellObj.constants));
    const integrationArray  = new Float32Array([integ.dt, integ.dx]);
    const visualParamsArray = new Float32Array([gui.__folders.Visualization.__controllers[0].getValue(), 
                                                gui.__folders.Visualization.__controllers[1].getValue(), 
                                                gui.__folders.Visualization.__controllers[2].getValue()]
    );
    const fiberOrientationArray = new Float32Array(Object.values(meshData.fibers_long));
    const connectionsArray      = new Uint32Array(Object.values(meshData.connections));

    const statesBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const fiberOrientationBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * fiberOrientationArray.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const connectionsBuffer = device.createBuffer({
        size: Uint32Array.BYTES_PER_ELEMENT * connectionsArray.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    const constantsBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const integBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const visualParamsBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });


    // TODO Read the tojiro post and determine which one of the two buffer creations (up or bottom) is better for us

    const vertexBuffer = createGPUBuffer(device, meshData.vertexs);
    const normalBuffer = createGPUBuffer(device, meshData.normals);
    const indexBuffer  = createGPUBufferUint(device, meshData.render_elems);
    const voiBuffer    = createGPUBuffer(device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE);
    const stimBuffer   = createGPUBuffer(device, meshData.stim_params, GPUBufferUsage.STORAGE); //Check this Storage TODO

    // RENDER PIPELINE ---------------------------------------------------
    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({                    
                code: commonVertFragShaders
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
                            //Vertex VoI shared with compute shader
                            shaderLocation: 2,
                            format: "float32",
                            offset: 0
                        }
                    ]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({                    
                code: commonVertFragShaders
            }),
            entryPoint: "fs_main",
            targets: [
                {
                    format: gpu.textureFormat as GPUTextureFormat
                }
            ]
        },
        primitive:{
            topology: "triangle-list",
            // cullMode: 'back'
        },
        depthStencil:{
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });

    // create render uniform data (for camera control and visualization)
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = createViewProjection(gpu.canvas.width/gpu.canvas.height);
    vpMatrix = vp.viewProjectionMatrix;

    // add rotation and camera:
    let rotation = vec3.fromValues(0, 0, 0);       
    var camera = createCamera(gpu.canvas, vp.cameraOption);

    const vertexRenderBuffer = device.createBuffer({
        size: 192,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: vertexRenderBuffer,
                    offset: 0,
                    size: 192
                }
            }        
        ]
    });

    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    
    const renderPassDescription = {
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

    // COMPUTE PIPELINES ---------------------------------------------------

    // Result Matrix
    const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * numberOfVertices;
    const resultBuffer1 = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const resultBuffer2 = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const resultBuffer3 = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const resultBuffer4 = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    const resultBuffer5 = device.createBuffer({
        size: resultMatrixBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });


    console.log(computeShaderMonodomainSurfDiffusion(cellObj.cellModel, numberOfVertices));
    const computePipelineDiffusion1 = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainSurfDiffusion(cellObj.cellModel, numberOfVertices),
          }),
          entryPoint: 'comp_monodomain_diffusion',
        },
    });

    const computeBindGroupDiffusion1 = device.createBindGroup({
        layout: computePipelineDiffusion1.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: statesBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: fiberOrientationBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * fiberOrientationArray.length,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: connectionsBuffer,
                        offset: 0,
                        size: Uint32Array.BYTES_PER_ELEMENT * connectionsArray.length,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: constantsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: integBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: resultBuffer1,
                        offset: 0,
                    },
                }
            ],
    });


    const computePipelineUpdateVm1 = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainSurfUpdateVmFromDifussion(cellObj.cellModel,numberOfVertices),
          }),
          entryPoint: 'comp_monodomain_update_V_from_diffusion',
        },
    });

    const computeBindGroupUpdateVm1 = device.createBindGroup({
        layout: computePipelineUpdateVm1.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: voiBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * numberOfVertices,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: statesBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: constantsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: integBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: visualParamsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: resultBuffer2,
                        offset: 0,
                    },
                }
            ],
    });

    const computePipelineReaction = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainSurfReaction(cellObj.cellModel,numberOfVertices),
          }),
          entryPoint: 'comp_monodomain_reaction',
        },
    });

    const computeBindGroupReaction = device.createBindGroup({
        layout: computePipelineReaction.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: stimBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * numberOfVertices * stimParamsNum,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: statesBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: constantsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: integBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: resultBuffer3,
                        offset: 0,
                    },
                }
            ],
    });

    const computePipelineDiffusion2 = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainSurfDiffusion(cellObj.cellModel, numberOfVertices),
          }),
          entryPoint: 'comp_monodomain_diffusion',
        },
    });

    const computeBindGroupDiffusion2 = device.createBindGroup({
        layout: computePipelineDiffusion2.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: statesBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: fiberOrientationBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * fiberOrientationArray.length,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: connectionsBuffer,
                        offset: 0,
                        size: Uint32Array.BYTES_PER_ELEMENT * connectionsArray.length,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: constantsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: integBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: resultBuffer4,
                        offset: 0,
                    },
                }
            ],
    });


    const computePipelineUpdateVm2 = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainSurfUpdateVmFromDifussion(cellObj.cellModel,numberOfVertices),
          }),
          entryPoint: 'comp_monodomain_update_V_from_diffusion',
        },
    });


    const computeBindGroupUpdateVm2 = device.createBindGroup({
        layout: computePipelineUpdateVm2.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: voiBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * numberOfVertices,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: statesBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: constantsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: integBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: visualParamsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: resultBuffer5,
                        offset: 0,
                    },
                }
            ],
    });




    //Update Visualization Params, we block this as the cell side should block it 
    // as we do not change the ylabel in cell part TODO
    device.queue.writeBuffer(
        visualParamsBuffer,
        0,
        new Float32Array([
            gui.__folders.Visualization.__controllers[0].getValue(),   
            gui.__folders.Visualization.__controllers[1].getValue(),
            gui.__folders.Visualization.__controllers[2].getValue()
        ])
    );

    device.queue.writeBuffer(
        statesBuffer,
        0,
        statesArray
    );

    device.queue.writeBuffer(
        fiberOrientationBuffer,
        0,
        fiberOrientationArray
    );

    device.queue.writeBuffer(
        connectionsBuffer,
        0,
        connectionsArray
    );

    //Draw function for updating data on canvas and triggering gpu updates
    async function draw() {

        stats.begin();
        
        //Update Params
        if (integ.simulate){integ.simulation_time += integ.dt;}

        device.queue.writeBuffer(
            constantsBuffer,
            0,
            new Float32Array(Object.values(cellObj.constants))
        );
        
        device.queue.writeBuffer(
            integBuffer,
            0,
            new Float32Array([
              integ.simulate ? integ.dt : 0.0,
              integ.dx  
            ])
        );

        // Update camera
        if(camera.tick()){  
            const pMatrix = vp.projectionMatrix;
            vMatrix = camera.matrix;
            mat4.multiply(vpMatrix, pMatrix, vMatrix);
            device.queue.writeBuffer(vertexRenderBuffer, 0, vpMatrix as ArrayBuffer);
        
            createTransforms(modelMatrix,[0,0,0], rotation);
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            device.queue.writeBuffer(vertexRenderBuffer, 64, modelMatrix as ArrayBuffer);
            device.queue.writeBuffer(vertexRenderBuffer, 128, normalMatrix as ArrayBuffer);
        }
                    
        //Generate the command encoder for both pipelines (Render and Compute)
        //and send them to the gpu
        const commandEncoder = device.createCommandEncoder();
        {   //Compute Update Diffusion
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipelineDiffusion1);
            passEncoder.setBindGroup(0, computeBindGroupDiffusion1);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfVertices / 255));
            passEncoder.end();
        }
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipelineUpdateVm1);
            passEncoder.setBindGroup(0, computeBindGroupUpdateVm1);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfVertices / 255));
            passEncoder.end();
        }
        {   //Compute Update Reaction
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipelineReaction);
            passEncoder.setBindGroup(0, computeBindGroupReaction);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfVertices / 255));
            passEncoder.end();
        }
        {   //Compute Update Diffusion
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipelineDiffusion2);
            passEncoder.setBindGroup(0, computeBindGroupDiffusion2);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfVertices / 255));
            passEncoder.end();
        }
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipelineUpdateVm2);
            passEncoder.setBindGroup(0, computeBindGroupUpdateVm2);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfVertices / 255));
            passEncoder.end();
        }
        {   //Render Update
            textureView = gpu.context.getCurrentTexture().createView();
            renderPassDescription.colorAttachments[0].view = textureView;
            
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
            passEncoder.setPipeline(renderPipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.setVertexBuffer(1, normalBuffer);
            passEncoder.setVertexBuffer(2, voiBuffer);
            passEncoder.setIndexBuffer(indexBuffer, 'uint32');
            passEncoder.setBindGroup(0, renderBindGroup);
            passEncoder.drawIndexed(numberOfIndexes);
            passEncoder.end();
        }
        // device.queue.submit([commandEncoder.finish()]);

        // stats.end();

        // requestAnimationFrame(draw)
                
        if ( integ.simulation_time > integ.debug_init_time ) {
            // RESULTS Get a GPU buffer for reading in an unmapped state.
            const gpuReadBuffer1 = device.createBuffer({
                size: resultMatrixBufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const gpuReadBuffer2 = device.createBuffer({
                size: resultMatrixBufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const gpuReadBuffer3 = device.createBuffer({
                size: resultMatrixBufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const gpuReadBuffer4 = device.createBuffer({
                size: resultMatrixBufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            const gpuReadBuffer5 = device.createBuffer({
                size: resultMatrixBufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });

            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(
                resultBuffer1 /* source buffer */,
                0 /* source offset */,
                gpuReadBuffer1 /* destination buffer */,
                0 /* destination offset */,
                resultMatrixBufferSize /* size */
            );
            commandEncoder.copyBufferToBuffer(
                resultBuffer2 /* source buffer */,
                0 /* source offset */,
                gpuReadBuffer2 /* destination buffer */,
                0 /* destination offset */,
                resultMatrixBufferSize /* size */
            );
            commandEncoder.copyBufferToBuffer(
                resultBuffer3 /* source buffer */,
                0 /* source offset */,
                gpuReadBuffer3 /* destination buffer */,
                0 /* destination offset */,
                resultMatrixBufferSize /* size */
            );
            commandEncoder.copyBufferToBuffer(
                resultBuffer4 /* source buffer */,
                0 /* source offset */,
                gpuReadBuffer4 /* destination buffer */,
                0 /* destination offset */,
                resultMatrixBufferSize /* size */
            );
            commandEncoder.copyBufferToBuffer(
                resultBuffer5 /* source buffer */,
                0 /* source offset */,
                gpuReadBuffer5 /* destination buffer */,
                0 /* destination offset */,
                resultMatrixBufferSize /* size */
            );
        

            // Submit GPU commands.
            const gpuCommands = commandEncoder.finish();
            device.queue.submit([gpuCommands]);

            // Read buffer.
            await gpuReadBuffer1.mapAsync(GPUMapMode.READ);
            const arrayBuffer1 = gpuReadBuffer1.getMappedRange();
            await gpuReadBuffer2.mapAsync(GPUMapMode.READ);
            const arrayBuffer2 = gpuReadBuffer2.getMappedRange();
            await gpuReadBuffer3.mapAsync(GPUMapMode.READ);
            const arrayBuffer3 = gpuReadBuffer3.getMappedRange();
            await gpuReadBuffer4.mapAsync(GPUMapMode.READ);
            const arrayBuffer4 = gpuReadBuffer4.getMappedRange();
            await gpuReadBuffer5.mapAsync(GPUMapMode.READ);
            const arrayBuffer5 = gpuReadBuffer5.getMappedRange();
            
            console.log(new Float32Array(arrayBuffer1));
            console.log(new Float32Array(arrayBuffer2));
            console.log(new Float32Array(arrayBuffer3));
            console.log(new Float32Array(arrayBuffer4));
            console.log(new Float32Array(arrayBuffer5));
        
        }else{
            // Submit GPU commands.
            const gpuCommands = commandEncoder.finish();
            device.queue.submit([gpuCommands]);
        }

        stats.end();
        

        requestAnimationFrame(draw);

    }

    requestAnimationFrame(draw)

}
