import { createTransforms, createViewProjection, meshObj} from '../helpers/helper';
import { createGPUBufferUint, createGPUBuffer, initGPU, repeatFloat32Array } from '../helpers/helper';
import { cellObj } from '../helpers/manageCellModelGUI';
import { commonVertFragShaders } from '../tissue_shaders/commonVertFragShaders.js';
import { computeShaderMonodomainLine } from '../tissue_shaders/simLineMonodomainShader.js';
import { mat4, vec3 } from 'gl-matrix';
import { GUI } from 'dat.gui';
import Stats from "stats.js";

const createCamera =require('3d-view-controls')


// This simulates line without Light as it is not neccessary
// Voi refers to Variable of interest
export const SimLineMonodomain = async (gui:GUI, meshData:meshObj, cellObj:cellObj) => {
    
    
    console.log("RENDERING AND SIMULATING LINE");
    console.log("SIMULATING CELL MODEL:");
    console.log(cellObj.cellModel)
    
    var stats = new Stats();
    stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
    document.body.appendChild( stats.dom );

    const gpu = await initGPU();
    const device = gpu.device;
    
    const integ = {
        simulate: true,
        dt : 0.1,     //[ms]
        dx : 100,     //Mesh edglength [um] 
        simulation_time : 0,
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

    // create buffers
    const numberOfIndexes  = meshData.render_elems.length;
    const numberOfVertices = Math.trunc(meshData.vertexs.length / 3);
    const stimParamsNum    = Math.trunc(meshData.stim_params.length / numberOfVertices);
    const voiInitValues    = new Float32Array(numberOfVertices);
    voiInitValues.fill(cellObj.states.vm)

    const statesArray       = repeatFloat32Array(new Float32Array(Object.values(cellObj.states)),numberOfVertices)
    const constantsArray    = new Float32Array(Object.values(cellObj.constants))
    const integrationArray  = new Float32Array([integ.dt, integ.dx]) 
    const visualParamsArray = new Float32Array([gui.__folders.Visualization.__controllers[0].getValue(), 
                                                gui.__folders.Visualization.__controllers[1].getValue(), 
                                                gui.__folders.Visualization.__controllers[2].getValue()]
    );

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

    // // Result Matrix
    // const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * numberOfVertices;
    // const resultMatrixBuffer = device.createBuffer({
    //     size: resultMatrixBufferSize,
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    // });

    // console.log(computeShaderMonodomainLine(cellObj.cellModel))
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainLine(cellObj.cellModel),
          }),
          entryPoint: 'comp_monodomain_main',
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
                }
                // {
                //     binding: 6,
                //     resource: {
                //         buffer: resultMatrixBuffer,
                //         offset: 0,
                //     },
                // }
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

    //Draw function for updating data on canvas and triggering gpu updates
    function draw() {

        stats.begin();
        
        //Update Params
        if (integ.simulate){integ.simulation_time += plot_dt;}

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

        stats.end();

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
