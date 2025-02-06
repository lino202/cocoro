import { initGPU, createGPUBuffer, createGPUBufferUint} from '../helpers/helper';
import { renderVertexFragmentShaders } from '../cellular_shaders/plot2DShaders';
import { initCanvas, setY, setX } from '../helpers/axis';
import { computeCellModel } from '../cellular_shaders/computeCellModel.js'
import { GUI } from 'dat.gui';
import Stats from "stats.js";


function getIndexesForLine(numPoints: number): Uint32Array{
    var indexs = new Uint32Array((numPoints-1)*2);
    
    var j = 1;
    indexs[0] = 0;
    for( let i=1; i<numPoints; i++){
        indexs[j] = i;
        if (j+1 >= indexs.length){break;}
        indexs[j+1] = i;
        j+=2;
    }
    return indexs;
}

function genInitArrays(numPoints: number): Float32Array {
    const xy = new Float32Array(numPoints*2);
    const y = new Float32Array(numPoints);

    var j = 0;
    for (let i = 0; i < numPoints*2; i=i+2) {
      xy[i] = i/numPoints -1;
      xy[i+1] = 0.0;
      y[j] = 0.0;
      j++;
    }

    const result = new Float32Array(xy.length + y.length);
    
    result.set(xy, 0);
    result.set(y, xy.length);
    return result;
}

// This simulates line without Light as it is not neccessary
// Voi refers to Variable of interest
export const SimCell = async (gui:GUI, cellModel:string, states:Record<string, number>, constants:Record<string, number>, stim:Record<string, number>, visualParams:Record<string, number>) => {
    console.log(`RENDERING PLOT AND SIMULATING CELL MODEL: ${cellModel}`);

    var stats = new Stats();
    stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
    document.body.appendChild( stats.dom );

    const integ = {
        simulate: true,
        dt : 0.02,
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
    var plot_dt        = visualParams.plot_dt;
    var varName        = gui.__folders.Visualization.__controllers[4].getValue();
    var workgroup_size = gui.__folders.gpuSettings.__controllers[0].getValue();
    var saveStart      = gui.__folders.Save.__controllers[0].getValue();
    var saveEnd        = gui.__folders.Save.__controllers[1].getValue();
    var debugStart     = gui.__folders.Debug.__controllers[0].getValue();
    var debugEnd       = gui.__folders.Debug.__controllers[1].getValue();
    var debugStateName = gui.__folders.Debug.__controllers[2].getValue();

    const gpu = await initGPU();
    const device = gpu.device;

    //Get canvases for axes
    const canvasX = document.getElementById("canvas_xAxis") as HTMLCanvasElement;
    const canvasY = document.getElementById("canvas_yAxis") as HTMLCanvasElement; 

    const ctxX = initCanvas(canvasX);
    const ctxY = initCanvas(canvasY);

    // For now this is desactivated 
    // if (ctxY) {setY(ctxY, canvasY.width, canvasY.height, visualParams.min, visualParams.max, 10);}
    // if (ctxX) {setX(ctxX, canvasX.width, canvasX.height, 0, visualParams.num_points * plot_dt, 10);}

    // create buffers 
    const indexs            = getIndexesForLine(visualParams.num_points);
    var tmp                 = genInitArrays(visualParams.num_points);
    var vertexs             = tmp.slice(0,visualParams.num_points*2);
    var voiInitValues       = tmp.slice(visualParams.num_points*2,tmp.length);
    const stimArray         = new Float32Array([stim.period, stim.amp, stim.dur, stim.start])
    const statesArray       = new Float32Array(Object.values(states))
    const constantsArray    = new Float32Array(Object.values(constants))
    const integrationArray  = new Float32Array([integ.dt]) 
    const visualParamsArray = new Float32Array([visualParams.min, visualParams.max, plot_dt])

    const statesBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * statesArray.length,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const constantsBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * constantsArray.length,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const stimBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT * stimArray.length,
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

    const numberOfIndexes   = indexs.length;
    const vertexBuffer      = createGPUBuffer(device, vertexs);
    const indexBuffer       = createGPUBufferUint(device, indexs);
    const voiBuffer         = createGPUBuffer(device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const voiBufferCopy     = createGPUBuffer(device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    
    // RENDER PIPELINE ---------------------------------------------------
    // We need to set the render pipeline
    const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: device.createShaderModule({                    
            code: renderVertexFragmentShaders
        }),
        entryPoint: "vs_main",
        buffers:[
            {
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
                attributes: [
                    {
                        //X-Y coordinates
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
                        //Vertex VoI shared with compute shader
                        shaderLocation: 1,
                        format: "float32",
                        offset: 0
                    }
                ]
            }
        ]
    },
    fragment: {
        module: device.createShaderModule({                    
            code: renderVertexFragmentShaders
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


    let textureView = gpu.context.getCurrentTexture().createView();
    const depthTexture = device.createTexture({
        size: [gpu.canvas.width, gpu.canvas.height, 1],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    const renderPassDescription = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.3, g: 0.2, b: 0.4, a: 1.0 }, //background color
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
                buffer: voiBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * visualParams.num_points,
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
                buffer: stimBuffer,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * stimArray.length,
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
        {
            binding: 6,
            resource: {
                buffer: voiBufferCopy,
                offset: 0,
                size: Float32Array.BYTES_PER_ELEMENT * visualParams.num_points,
            },
        }
    ];
    
    // Save buffer for results
    const nodeResultsSize = Float32Array.BYTES_PER_ELEMENT * 1;  // This is just a cell
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
            binding: 7,
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
        if (!(debugStateName in states)) {
            throw new Error(`Debug state name "${debugStateName}" is not a valid state for ${cellModel} cell model`);
        }

        debugBuffer = device.createBuffer({
            size: nodeResultsSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        if (saveStart >= 0){
            computeBindGroupEntries.push({
                binding: 8,
                resource: {
                    buffer: debugBuffer,
                    offset: 0,
                    size: nodeResultsSize,
                },
            });
        }else{
            computeBindGroupEntries.push({
                binding: 7,
                resource: {
                    buffer: debugBuffer,
                    offset: 0,
                    size: nodeResultsSize,
                },
            });
        }
    }
 
    console.log(computeCellModel(cellModel, workgroup_size, saveStart, debugStart, debugStateName, varName))
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeCellModel(cellModel, workgroup_size, saveStart, debugStart, debugStateName, varName),
          }),
          entryPoint: 'comp_main',
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

    //Draw function for updating data on canvas and triggering gpu updates
    async function draw() {

        stats.begin();

        if (!integ.simulate) {
            stats.end();
            requestAnimationFrame(draw); // Keep looping but do nothing
            return;
        }

        //Update Params
        device.queue.writeBuffer(
            visualParamsBuffer,
            0,
            new Float32Array([
                gui.__folders.Visualization.__controllers[0].getValue(),   
                gui.__folders.Visualization.__controllers[1].getValue(),
                gui.__folders.Visualization.__controllers[2].getValue()   //TODO plot dt is fixed for now but can it be variable? Check tissue sims
            ])
        );
        device.queue.writeBuffer(
            stimBuffer,
            0,
            new Float32Array([stim.period, stim.amp, stim.dur, stim.start])
        );
        device.queue.writeBuffer(
            constantsBuffer,
            0,
            new Float32Array(Object.values(constants))
        );
        device.queue.writeBuffer(
            integBuffer,
            0,
            new Float32Array([
              integ.simulate ? integ.dt : 0.0, // I think this is not necessary  
            ])
        );
        
        //Generate the command encoder for both pipelines (Render and Compute)
        //and send them to the gpu
        const commandEncoder = device.createCommandEncoder();
        {   //Compute Update - The cell has the loop inside so the multiple computes are already in the one iteration of the computeShader
            // which is different to the tissue sims as here in the cell we do not have data race due to spatial derivatives computation
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, computeBindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(visualParams.num_points / workgroup_size));
            passEncoder.end();
        }
        {   //Render Update
            textureView = gpu.context.getCurrentTexture().createView();
            renderPassDescription.colorAttachments[0].view = textureView;
            
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
            passEncoder.setPipeline(renderPipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.setVertexBuffer(1, voiBuffer);
            passEncoder.setIndexBuffer(indexBuffer, 'uint32');
            passEncoder.drawIndexed(numberOfIndexes);
            passEncoder.end();
        }
        commandEncoder.copyBufferToBuffer(voiBuffer, 0, voiBufferCopy, 0, visualParams.num_points * Float32Array.BYTES_PER_ELEMENT);  // This avoids data race 
        
        // Save or debug - Copying buffer to buffer
        if (integ.simulation_time >= saveStart && stepsCount <= totalStepsToSave-1 && integ.simulate) {
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

        device.queue.submit([commandEncoder.finish()]);


        // Save or debug - get from gpu
        if (integ.simulation_time >= saveStart && stepsCount <= totalStepsToSave-1 && integ.simulate) {
    
            // Get the data from the gpu
            await readSaveBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = readSaveBuffer.getMappedRange();

            // Generate the wildcard string for the ensight file
            const wildcardString = stepsCount.toString().padStart(totalStepsToSave.toString().length, '0');
            
            // Save dynamically
            // Save does not do shit for now in sim cell
            // ensightWriter.saveStates(arrayBuffer, wildcardString); // TODO think pf a writer for this data
            
            savedSimulation = true;
            stepsCount++;
        }
        if (stepsCount > totalStepsToSave-1 && savedSimulation) {
            savedSimulation = false;
            // Save geometry and case for ensight  // TODO think pf a writer for this data
            // ensightWriter.saveGeometry(meshData);
            // ensightWriter.saveAnimation(totalStepsToSave, plot_dt, saveStart);

            // console.log('Animation saved as: ', ensightWriter.animationFileName);
            // console.log('Geometry saved as: ', ensightWriter.geometryFileName);
            // console.log('States saved as: ', ensightWriter.statesFileName + '*.ens');
        } 

        if (integ.simulation_time >= debugStart && integ.simulation_time <= debugEnd && integ.simulate) {
            await readDebugBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = readDebugBuffer.getMappedRange();
            console.log(integ.simulation_time)
            console.log(new Float32Array(arrayBuffer));
        }


        integ.simulation_time += plot_dt;

        stats.end();
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
}
