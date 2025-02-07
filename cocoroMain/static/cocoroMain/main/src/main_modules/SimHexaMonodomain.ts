import { createTransforms, createViewProjection, meshObj, electrodesObj} from '../helpers/helper';
import { createGPUBufferUint, createGPUBuffer, initGPU, repeatFloat32Array } from '../helpers/helper';
import { LightInputsInterface } from '../helpers/mysettings';
import { cellObj } from '../helpers/manageCellModelGUI';
import { commonVertFragShaders } from '../tissue_shaders/commonVertFragShaders.js';
import { computeShaderMonodomainHexa } from '../tissue_shaders/simHexaMonodomainShader.js';
import EnsightWriter from '../io/ensightWriter';
import GraphsRenderer from '../graphs/GraphsRenderer';
import { mat4, vec3 } from 'gl-matrix';
import { GUI } from 'dat.gui';
import Stats from "stats.js";

const createCamera =require('3d-view-controls')



export const SimHexaMonodomain = async (gui:GUI, meshData:meshObj, electrodesData:electrodesObj, cellObj:cellObj, li:LightInputsInterface, ensightWriter:EnsightWriter|undefined, guiCellVarGraph:GUI, guiPECGGraph:GUI) => {
    
    // NOTES:
    // For now saving and debugging are constrainly defined before setting the sim 
    // as the compute shader should already have the defined buffers and so on
    // so it seems this will be it
    // This simulates hexas WITH Light as it is neccessary
    // TODO ATTENTION Vm needs to be in states for debugging,
    // Pay attention that vertexs are for the render mesh and actual_points are for the actual mesh (in quad and line these are equal)

    console.log("RENDERING AND SIMULATING HEXA");
    console.log(`SIMULATING CELL MODEL: ${cellObj.cellModel}`);
    
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
    const graphsRenderer:GraphsRenderer = new GraphsRenderer(device, gpu.textureFormat, gpu.extraCanvases, 
                                            cellObj, meshData, electrodesData, 
                                            guiCellVarGraph, guiPECGGraph);
    
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

    // Get the values from the GUI 
    var plot_dt        = gui.__folders.Visualization.__controllers[2].getValue();
    var workgroup_size = gui.__folders.gpuSettings.__controllers[0].getValue();
    var saveStart      = gui.__folders.Save.__controllers[0].getValue();
    var saveEnd        = gui.__folders.Save.__controllers[1].getValue();
    var debugStart     = gui.__folders.Debug.__controllers[0].getValue();
    var debugEnd       = gui.__folders.Debug.__controllers[1].getValue();
    var debugStateName = gui.__folders.Debug.__controllers[2].getValue();

    // Create arrays and buffers
    const numberOfIndexes   = meshData.render_elems.length;
    const numberOfVertices  = Math.trunc(meshData.vertexs.length / 3); // vertexs are only the surface one in Hex
    const numberOfPoints    = Math.trunc(meshData.fibers_long.length / 3); // points are all points in the entire mesh
    const stimParamsNum     = Math.trunc(meshData.stim_params.length / numberOfPoints);
    const vmArray           = new Float32Array(numberOfPoints).fill(cellObj.states.vm);
    const vmArrayVertexs    = new Float32Array(numberOfVertices).fill(cellObj.states.vm);
    const statesArray       = repeatFloat32Array(new Float32Array(Object.values(cellObj.states)),numberOfPoints);
    const constantsArray    = new Float32Array(Object.values(cellObj.constants));
    const integrationArray  = new Float32Array([integ.dt, integ.dx]);
    const visualParamsArray = new Float32Array([gui.__folders.Visualization.__controllers[0].getValue(), 
                                                gui.__folders.Visualization.__controllers[1].getValue()]
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
    const vertexBuffer    = createGPUBuffer(device, meshData.vertexs);
    const normalBuffer    = createGPUBuffer(device, meshData.normals);
    const indexBuffer     = createGPUBufferUint(device, meshData.render_elems);
    const stimBuffer      = createGPUBuffer(device, meshData.stim_params, GPUBufferUsage.STORAGE); //Check this Storage TODO
    const vmBuffer        = createGPUBuffer(device, vmArray, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC); //This saves ALL (not only on the render mesh vertexs) vms for having a continguous buffer to copy
    const vmBufferCopy    = createGPUBuffer(device, vmArray, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST); //This saves ALL (not only on the render mesh vertexs) vms for reading values in spatial derivatives computation and avoid data races
    const vmVertexsBuffer = createGPUBuffer(device, vmArrayVertexs, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE); //This saves only vms of the render mesh vertexs for rendering
    
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
                            //Vertex Vm shared with compute shader
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
                    buffer: visualParamsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * visualParamsArray.length
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: fragmentUniformBuffer,
                    offset: 0,
                    size: 32
                }
            },
            {
                binding: 3,
                resource: {
                    buffer: colorUniformBuffer,
                    offset: 0,
                    size: 32
                }
            },
            {
                binding: 4,
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
    const computeBindGroupEntries = [
        {
            binding: 0,
            resource: {
                buffer: vmBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * numberOfPoints,
            },
        },
        {
            binding: 1,
            resource: {
                buffer: vmBufferCopy,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * numberOfPoints,
            },
        },
        {
            binding: 2,
            resource: {
                buffer: vmVertexsBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * numberOfVertices,
            },
        },
        {
            binding: 3,
            resource: {
                buffer: stimBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * numberOfPoints * stimParamsNum,
            },
        },
        {
            binding: 4,
            resource: {
                buffer: statesBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
            },
        },
        {
            binding: 5,
            resource: {
                buffer: fiberOrientationBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * fiberOrientationArray.length,
            },
        },
        {
            binding: 6,
            resource: {
                buffer: connectionsBuffer,
                offset: 0,
                size: Uint32Array.BYTES_PER_ELEMENT * connectionsArray.length,
            },
        },
        {
            binding: 7,
            resource: {
                buffer: constantsBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
            },
        },
        {
            binding: 8,
            resource: {
                buffer: integBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * integrationArray.length,
            },
        },
        {
            binding: 9,
            resource: {
                buffer: renderPointsBuffer,
                offset: 0,
                size: Uint32Array.BYTES_PER_ELEMENT * renderPointsArray.length,
            },
        }
    ];


    // Save buffer for results
    const nodeResultsSize = Float32Array.BYTES_PER_ELEMENT * numberOfPoints;
    let saveBuffer: GPUBuffer;
    let readSaveBuffer: GPUBuffer;
    let savedSimulation:boolean = false;
    let totalStepsToSave:number = 0;
    let stepsCount:number = 0;
    if (saveStart >= 0) {
        saveBuffer = device.createBuffer({
            size: nodeResultsSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        computeBindGroupEntries.push({
            binding: 10,
            resource: {
                buffer: saveBuffer,
                offset: 0,
                size: nodeResultsSize,
            },
        });

        totalStepsToSave = Math.floor((saveEnd - saveStart) / plot_dt) + 1;
    }

    // Debug buffer for debugging a state variable
    let debugBuffer: GPUBuffer;
    let readDebugBuffer: GPUBuffer;
    if (debugStart >= 0) {
        if (!(debugStateName in cellObj.states)) {
            throw new Error(`Debug state name "${debugStateName}" is not a valid state for ${cellObj.cellModel} cell model`);
        }

        debugBuffer = device.createBuffer({
            size: nodeResultsSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        if (saveStart >= 0){
            computeBindGroupEntries.push({
                binding: 11,
                resource: {
                    buffer: debugBuffer,
                    offset: 0,
                    size: nodeResultsSize,
                },
            });
        }else{
            computeBindGroupEntries.push({
                binding: 10,
                resource: {
                    buffer: debugBuffer,
                    offset: 0,
                    size: nodeResultsSize,
                },
            });
        }
    }
    

    console.log(computeShaderMonodomainHexa(cellObj.cellModel, numberOfPoints, numberOfVertices, workgroup_size, saveStart, debugStart, debugStateName))
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeShaderMonodomainHexa(cellObj.cellModel, numberOfPoints, numberOfVertices, workgroup_size, saveStart, debugStart, debugStateName),
          }),
          entryPoint: 'comp_monodomain_main',
        },
    });

    const computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: computeBindGroupEntries,
    });

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
    // var startTime = performance.now();
    async function draw() {

        stats.begin();

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

        // This should be done here to change colors shown on pause
        device.queue.writeBuffer(
            visualParamsBuffer,
            0,
            new Float32Array([
                gui.__folders.Visualization.__controllers[0].getValue(),   
                gui.__folders.Visualization.__controllers[1].getValue()
            ])
        );

        if (!integ.simulate) {

            // We render the for getting the camera changes
            const commandEncoder = device.createCommandEncoder();
            textureView = gpu.context.getCurrentTexture().createView();
            renderPassDescription.colorAttachments[0].view = textureView;
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
            passEncoder.setPipeline(renderPipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.setVertexBuffer(1, normalBuffer);
            passEncoder.setVertexBuffer(2, vmVertexsBuffer);
            passEncoder.setIndexBuffer(indexBuffer, 'uint32');
            passEncoder.setBindGroup(0, renderBindGroup);
            passEncoder.drawIndexed(numberOfIndexes);
            passEncoder.end();

            const gpuCommands = commandEncoder.finish();
            device.queue.submit([gpuCommands]);

            stats.end();
            requestAnimationFrame(draw); // Keep looping but do nothing
            return;
        }

        // if ((integ.simulation_time % 100 < plot_dt) && (integ.simulation_time % 100 > 0)){
        //     var stopTime = performance.now();
        //     console.log("Simulation time for computing 100 ms");
        //     console.log(stopTime - startTime);
        //     startTime = performance.now();
        // }
        
        //Update Params
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
                    
        // Create commandEncoder and add compute and render guidelines
        const iterations_per_plotdt = Math.ceil(plot_dt/integ.dt); //integ.dt might change
        const commandEncoder = device.createCommandEncoder();

        // Several Compute Updates
        for(let i=0; i<iterations_per_plotdt; i++){
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, computeBindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(numberOfPoints/workgroup_size));
            passEncoder.end();
            commandEncoder.copyBufferToBuffer(vmBuffer, 0, vmBufferCopy, 0, vmArray.byteLength);  // This avoids data race 
        }
        // One render update
        {
            textureView = gpu.context.getCurrentTexture().createView();
            renderPassDescription.colorAttachments[0].view = textureView;
            
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
            passEncoder.setPipeline(renderPipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.setVertexBuffer(1, normalBuffer);
            passEncoder.setVertexBuffer(2, vmVertexsBuffer);
            passEncoder.setIndexBuffer(indexBuffer, 'uint32');
            passEncoder.setBindGroup(0, renderBindGroup);
            passEncoder.drawIndexed(numberOfIndexes);
            passEncoder.end();
        }

        // Add render pass for possible new canvases
        if (graphsRenderer.isActivated) {
            graphsRenderer.render(commandEncoder)
        }
        
        // Save or debug - Copying buffer to buffer.
        if (integ.simulation_time >= saveStart && stepsCount <= totalStepsToSave-1 && integ.simulate && ensightWriter != undefined) {
            readSaveBuffer = device.createBuffer({
                label: 'Read Save Buffer',
                size: nodeResultsSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            commandEncoder.copyBufferToBuffer(saveBuffer, 0, readSaveBuffer, 0, nodeResultsSize);
        }
        if (integ.simulation_time >= debugStart && integ.simulation_time <= debugEnd && integ.simulate) {
            readDebugBuffer = device.createBuffer({
                label: 'Read Save Buffer',
                size: nodeResultsSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            commandEncoder.copyBufferToBuffer(debugBuffer, 0, readDebugBuffer, 0, nodeResultsSize);
        }

        // Submit GPU commands.
        const gpuCommands = commandEncoder.finish();
        device.queue.submit([gpuCommands]);

        // Save or debug - get from gpu
        if (integ.simulation_time >= saveStart && stepsCount <= totalStepsToSave-1 && integ.simulate && ensightWriter != undefined) {
            
            // Get the data from the gpu
            await readSaveBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = readSaveBuffer.getMappedRange();

            // Generate the wildcard string for the ensight file
            const wildcardString = stepsCount.toString().padStart(totalStepsToSave.toString().length, '0');
            
            // Save dynamically
            ensightWriter.saveStates(arrayBuffer, wildcardString);
            
            savedSimulation = true;
            stepsCount++;
        }
        if (stepsCount > totalStepsToSave-1 && savedSimulation && ensightWriter != undefined) {
            savedSimulation = false;
            // Save geometry and case for ensight
            ensightWriter.saveGeometry(meshData);
            ensightWriter.saveAnimation(totalStepsToSave, plot_dt, saveStart);

            console.log('Animation saved as: ', ensightWriter.animationFileName);
            console.log('Geometry saved as: ', ensightWriter.geometryFileName);
            console.log('States saved as: ', ensightWriter.statesFileName + '*.ens');
        } 

        if (integ.simulation_time >= debugStart && integ.simulation_time <= debugEnd && integ.simulate) {
            await readDebugBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = readDebugBuffer.getMappedRange();
            console.log(integ.simulation_time)
            console.log(new Float32Array(arrayBuffer));
        }

        integ.simulation_time += integ.dt * iterations_per_plotdt;
        
        stats.end();
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw)

}