import { initGPU, createGPUBuffer, createTransforms, createViewProjection} from '../helpers/helper';
import { createGPUBufferUint, repeatFloat32Array } from '../helpers/helper';
import { commonVertFragShaders } from '../tissue_shaders/commonVertFragShaders.js';
import { simLineHeatComputeShader } from '../miscellaneous_shaders/simLineHeatShader.js';
import { mat4, vec3 } from 'gl-matrix';
import { GUI } from 'dat.gui'
const createCamera =require('3d-view-controls')


export const SimLineHeat = async (vertexs:Float32Array, normals:Float32Array, indexs:Uint32Array, voiInitValues:Float32Array, stimParams:Float32Array) => {
    console.log("RENDERING AND SIMULATING LINE");
    const gpu = await initGPU();
    const device = gpu.device;

    //General simulation and visualization params
    const constants = {
        k        : 0.05,   //Diff termica [cm2/s]
    };

    const states = {
        t : 0
    };

    const integ = {
        simulate : true,
        dt       : 0.01,
        dx       : 0.1,
    };

    const visualParams = {
        voiMax   : 100.,
        voiMin   : 0.,
        plot_dt  : 1.,
    }

    //Dat.gui definition
    const gui             = new GUI();
    const visualsFolder = gui.addFolder('Visualization')
    const ConstantsFolder    = gui.addFolder('Constants')
    const integFolder = gui.addFolder('Integration');
    
    Object.keys(integ).forEach((k) => {integFolder.add(integ, k);});
    Object.keys(visualParams).forEach((k) => {visualsFolder.add(visualParams, k);});
    Object.keys(constants).forEach((k) => {ConstantsFolder.add(constants, k);});

    // create buffers
    const numberOfIndexes  = indexs.length;
    const numberOfVertices = voiInitValues.length;
    const stimParamsNum    = Math.trunc(stimParams.length / numberOfVertices);
    
    
    const statesArray       = repeatFloat32Array(new Float32Array(Object.values(states)), numberOfVertices)
    const constantsArray    = new Float32Array(Object.values(constants));
    const integrationArray  = new Float32Array([integ.dt, integ.dx]);
    const visualParamsArray = new Float32Array([visualParams.voiMax, visualParams.voiMin, visualParams.plot_dt]);

    const statesBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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

    
    const vertexBuffer     = createGPUBuffer(device, vertexs);
    const normalBuffer     = createGPUBuffer(device, normals);
    const indexBuffer      = createGPUBufferUint(device, indexs);
    const voiBuffer        = createGPUBuffer(device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE);
    const stimBuffer = createGPUBuffer(device, stimParams, GPUBufferUsage.STORAGE); //Check this Storage TODO

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
            topology: "line-list",
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

    // COMPUTE PIPELINE ---------------------------------------------------
    
    //SimParams is an uniform as it contains
    //"uniform" data to the overall simulation

    // // Result Matrix
    // const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * numberOfVertices;
    // const resultMatrixBuffer = device.createBuffer({
    //     size: resultMatrixBufferSize,
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    // });

    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: simLineHeatComputeShader,
          }),
          entryPoint: 'comp_heat_main',
        },
    });

    const computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
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
                        buffer: stimBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * numberOfVertices * stimParamsNum,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: statesBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
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
                        buffer: visualParamsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
                    },
                },
                // {
                //     binding: 6,
                //     resource: {
                //         buffer: resultMatrixBuffer,
                //         offset: 0,
                //     },
                // }
            ],
    });

    // States is the only one written one time in heat
    device.queue.writeBuffer(
        statesBuffer,
        0,
        statesArray
    );

    //Draw function for updating data on canvas and triggering gpu updates
    function draw() {
        
        //Update Params
        device.queue.writeBuffer(
            constantsBuffer,
            0,
            new Float32Array([ 
              constants.k * integ.dt / (integ.dx*integ.dx) //lambda
            ])
        );

        device.queue.writeBuffer(
            visualParamsBuffer,
            0,
            new Float32Array([
              visualParams.voiMax,   
              visualParams.voiMin,
              visualParams.plot_dt
            ])
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
        {   //Compute Update
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, computeBindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfVertices / 64));
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
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(draw)

        // // RESULTS Get a GPU buffer for reading in an unmapped state.
        // const gpuReadBuffer = device.createBuffer({
        //     size: resultMatrixBufferSize,
        //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        // });

        // // Encode commands for copying buffer to buffer.
        // commandEncoder.copyBufferToBuffer(
        //     resultMatrixBuffer /* source buffer */,
        //     0 /* source offset */,
        //     gpuReadBuffer /* destination buffer */,
        //     0 /* destination offset */,
        //     resultMatrixBufferSize /* size */
        // );

        // // Submit GPU commands.
        // const gpuCommands = commandEncoder.finish();
        // device.queue.submit([gpuCommands]);

        // // Read buffer.
        // await gpuReadBuffer.mapAsync(GPUMapMode.READ);
        // const arrayBuffer = gpuReadBuffer.getMappedRange();
        // console.log(new Float32Array(arrayBuffer));

        // requestAnimationFrame(draw);

    }

    requestAnimationFrame(draw)

}
