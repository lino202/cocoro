import { createTransforms, createViewProjection, meshObj} from '../helpers/helper';
import { createGPUBufferUint, createGPUBuffer, initGPU, repeatFloat32Array } from '../helpers/helper';
import { LightInputsInterface } from '../helpers/mysettings';
import { cellObj } from '../helpers/manageCellModelGUI';
import { commonVertFragShaders } from '../tissue_shaders/commonVertFragShaders.js';
import { computeShaderMonodomainHexa } from '../tissue_shaders/simHexaMonodomainShader.js';
import { mat4, vec3 } from 'gl-matrix';
import { GUI } from 'dat.gui';
import Stats from "stats.js";

const createCamera =require('3d-view-controls')

export const SimHexaMonodomain = async (gui:GUI, meshData:meshObj, cellObj:cellObj, li:LightInputsInterface) => {
    
    console.log("RENDERING AND SIMULATING HEXA");
    console.log("SIMULATING CELL MODEL:");
    console.log(cellObj.cellModel)
    
    var stats = new Stats();
    stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
    document.body.appendChild( stats.dom );

    // define default input values: TODO maybe define this in helper/mysettings
    li.color = li.color == undefined ? '0.0, 1.0, 0.0' : li.color;
    li.ambientIntensity = li.ambientIntensity == undefined ? '0.2' : li.ambientIntensity;
    li.diffuseIntensity = li.diffuseIntensity == undefined ? '0.8' : li.diffuseIntensity;
    li.specularIntensity = li.specularIntensity == undefined ? '0.2' : li.specularIntensity;
    li.shininess = li.shininess == undefined ? '30.0' : li.shininess;
    li.specularColor = li.specularColor == undefined ? '1.0, 1.0, 1.0' : li.specularColor;
    li.isTwoSideLighting = li.isTwoSideLighting == undefined ? '1.0' : li.isTwoSideLighting;

    const gpu = await initGPU();
    const device = gpu.device;
    
    const integ = {
        simulate: true,
        dt : 0.02,     //[ms]
        dx : meshData.dx,     //Mesh edglength [um] 
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
    var workgroup_size = gui.__folders.gpuSettings.__controllers[0].getValue();

    // create arrays and buffers
    const numberOfIndexes  = meshData.render_elems.length;
    const numberOfVertices = Math.trunc(meshData.vertexs.length / 3); // vertexs are only the surface one in Hex
    const numberOfPoints   = Math.trunc(meshData.fibers_long.length / 3); // vertexs are only the surface one in Hex
    const stimParamsNum    = Math.trunc(meshData.stim_params.length / numberOfPoints);
    const voiInitValues    = new Float32Array(numberOfVertices);
    voiInitValues.fill(cellObj.states.vm)
    // voiInitValues.fill(0.9)

    const statesArray       = repeatFloat32Array(new Float32Array(Object.values(cellObj.states)),numberOfPoints);
    const constantsArray    = new Float32Array(Object.values(cellObj.constants));
    const integrationArray  = new Float32Array([integ.dt, integ.dx]);
    const visualParamsArray = new Float32Array([gui.__folders.Visualization.__controllers[0].getValue(), 
                                                gui.__folders.Visualization.__controllers[1].getValue(), 
                                                gui.__folders.Visualization.__controllers[2].getValue()]
    );
    const fiberOrientationArray = new Float32Array(Object.values(meshData.fibers_long));
    const connectionsArray      = new Uint32Array(Object.values(meshData.connections));
    const renderPointsArray     = new Uint32Array(Object.values(meshData.render_points_global_ids));

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
    const renderPointsBuffer = device.createBuffer({
        size: Uint32Array.BYTES_PER_ELEMENT * renderPointsArray.length,
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

    const vertexRenderBuffer = device.createBuffer({
        size: 192,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const fragmentUniformBuffer = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const colorUniformBuffer = device.createBuffer({    //buffer of 32 bytes with 16 for light color vector and the rest 16 bytes for specular color 
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const lightUniformBuffer = device.createBuffer({    
        size: 20,
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
                code:  commonVertFragShaders(meshData.elementType)
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
                code:  commonVertFragShaders(meshData.elementType)
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
    let eyePosition = new Float32Array(vp.cameraOption.eye);
    let lightPosition = eyePosition;

    device.queue.writeBuffer(colorUniformBuffer, 0, new Float32Array(li.color?.split(',').map(Number)!));
    device.queue.writeBuffer(colorUniformBuffer, 16, new Float32Array(li.specularColor?.split(',').map(Number)!));

    // get realiable light parameters and associated with the correct buffer and passed to the device
    const lightParams = new Float32Array([
        parseFloat(li.ambientIntensity?.toString()!),
        parseFloat(li.diffuseIntensity?.toString()!),
        parseFloat(li.specularIntensity?.toString()!),
        parseFloat(li.shininess?.toString()!),
        parseFloat(li.isTwoSideLighting?.toString()!),
    ]);
    device.queue.writeBuffer(lightUniformBuffer, 0, lightParams);


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
            },
            {
                binding: 1,
                resource: {
                    buffer: fragmentUniformBuffer,
                    offset: 0,
                    size: 32
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: colorUniformBuffer,
                    offset: 0,
                    size: 32
                }
            },
            {
                binding: 3,
                resource: {
                    buffer: lightUniformBuffer,
                    offset: 0,
                    size: 20
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

    // Result Matrix
    // const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * numberOfPoints;
    // const resultMatrixBuffer = device.createBuffer({
    //     size: resultMatrixBufferSize,
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    // });

    console.log(computeShaderMonodomainHexa(cellObj.cellModel, numberOfPoints, workgroup_size))
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainHexa(cellObj.cellModel, numberOfPoints, workgroup_size),
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
                        size: Float32Array.BYTES_PER_ELEMENT * numberOfPoints * stimParamsNum,
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
                        buffer: fiberOrientationBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * fiberOrientationArray.length,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: connectionsBuffer,
                        offset: 0,
                        size: Uint32Array.BYTES_PER_ELEMENT * connectionsArray.length,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: constantsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
                    },
                },
                {
                    binding: 6,
                    resource: {
                        buffer: integBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
                    },
                },
                {
                    binding: 7,
                    resource: {
                        buffer: visualParamsBuffer,
                        offset: 0,
                        size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length,
                    },
                },
                {
                    binding: 8,
                    resource: {
                        buffer: renderPointsBuffer,
                        offset: 0,
                        size: Uint32Array.BYTES_PER_ELEMENT * renderPointsArray.length,
                    },
                },

                // {
                //     binding: 9,
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


    device.queue.writeBuffer(
        renderPointsBuffer,
        0,
        renderPointsArray
    );

    //Draw function for updating data on canvas and triggering gpu updates
    var startTime = performance.now();
    function draw() {

        stats.begin();
        if ((integ.simulation_time % 100 < plot_dt) && (integ.simulation_time % 100 > 0)){
            var stopTime = performance.now();
            console.log("Simulation time for computing 100 ms");
            console.log(stopTime - startTime);
            startTime = performance.now();
        }
        
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

            eyePosition = new Float32Array(camera.eye.flat());
            lightPosition = eyePosition;
            device.queue.writeBuffer(vertexRenderBuffer, 0, vpMatrix as ArrayBuffer);
            device.queue.writeBuffer(fragmentUniformBuffer, 0, eyePosition);
            device.queue.writeBuffer(fragmentUniformBuffer, 16, lightPosition);
        
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
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfPoints/workgroup_size));
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

        // stats.end();

        // // Read buffer.
        // await gpuReadBuffer.mapAsync(GPUMapMode.READ);
        // const arrayBuffer = gpuReadBuffer.getMappedRange();
        // // if ((integ.simulation_time > 80) && (integ.simulation_time < 120)) {
        // console.log(new Float32Array(arrayBuffer));
        // // }   
        

        // requestAnimationFrame(draw);

    }

    requestAnimationFrame(draw)

}
