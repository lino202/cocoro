import { initGPU, createGPUBuffer, createGPUBufferUint} from '../helpers/helper';
import { renderVertexFragmentShaders } from '../cellModels/plot2DShaders.js';
import { initCanvas, setY, setX } from '../helpers/axis';
import { computeCellModel } from '../cellModels/computeCellModel.js'
import { GUI } from 'dat.gui';


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
    console.log("RENDERING PLOT AND SIMULATING CELL MODEL:");
    console.log(cellModel)

    const integ = {
        simulate: true,
        dt : 0.1,
    }
    const integFolder = gui.addFolder('Integration');
    Object.keys(integ).forEach((k) => {integFolder.add(integ, k);});

    const gpu = await initGPU();
    const device = gpu.device;

    const indexs = getIndexesForLine(visualParams.num_points);
    var tmp   = genInitArrays(visualParams.num_points);
    var vertexs = tmp.slice(0,visualParams.num_points*2);
    var voiInitValues = tmp.slice(visualParams.num_points*2,tmp.length);

    //Get canvases for axes
    const canvasX = document.getElementById("canvas_xAxis") as HTMLCanvasElement;
    const canvasY = document.getElementById("canvas_yAxis") as HTMLCanvasElement; 

    const ctxX = initCanvas(canvasX);
    const ctxY = initCanvas(canvasY);
    // const ymax = gui.__folders.Visualization.__controllers[1].getValue();
    // const ymin = gui.__folders.Visualization.__controllers[0].getValue()

    if (ctxY) {setY(ctxY, canvasY.width, canvasY.height, visualParams.voiMin, visualParams.voiMax, 10);}
    if (ctxX) {setX(ctxX, canvasX.width, canvasX.height, 0, visualParams.num_points * visualParams.plot_dt, 10);}

    // create buffers 

    const stimArray = new Float32Array([stim.period, stim.amp, stim.dur, stim.start])
    const statesArray = new Float32Array(Object.values(states))
    const constantsArray = new Float32Array(Object.values(constants))
    const integrationArray = new Float32Array([integ.dt]) 
    const visualParamsArray = new Float32Array(Object.values(visualParams))

    const numberOfIndexes  = indexs.length;
    // const numberVoiValues = visualParams.num_points;
    const vertexBuffer     = createGPUBuffer(device, vertexs);
    const indexBuffer      = createGPUBufferUint(device, indexs);
    const voiBuffer        = createGPUBuffer(device, voiInitValues, GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE);
    
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
    
    //States and Constants Buffer is an uniform that takes all the initialize variables (constants and states)
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

    // Result Matrix
    // const resultsBufferSize = Float32Array.BYTES_PER_ELEMENT * voiInitValues.length;
    // const resultsBuffer = device.createBuffer({
    //     size: resultsBufferSize,
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    // });
 
    const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: device.createShaderModule({
            code: computeCellModel(cellModel),
          }),
          entryPoint: 'comp_main',
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
                }
                // {
                //     binding: 6,
                //     resource: {
                //         buffer: resultsBuffer,
                //         offset: 0,
                //     },
                // }
            ],
    });

    device.queue.writeBuffer(
        visualParamsBuffer,
        0,
        visualParamsArray
    );


    device.queue.writeBuffer(
        statesBuffer,
        0,
        statesArray
    );

    //Draw function for updating data on canvas and triggering gpu updates
    function draw() {
        
        //Update params (only constants and stim. States and visuals won't change for now)
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
              integ.simulate ? integ.dt : 0.0,   
            ])
        );


        //Generate the command encoder for both pipelines (Render and Compute)
        //and send them to the gpu
        const commandEncoder = device.createCommandEncoder();

        {   //Compute Update
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(computePipeline);
            passEncoder.setBindGroup(0, computeBindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(visualParams.num_points / 64));
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
            // passEncoder.setBindGroup(0, renderBindGroup);
            passEncoder.drawIndexed(numberOfIndexes);
            passEncoder.end();
        }
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(draw);

        // RESULTS Get a GPU buffer for reading in an unmapped state.
        // const gpuReadBuffer = device.createBuffer({
        //     size: resultsBufferSize,
        //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        // });

        // // Encode commands for copying buffer to buffer.
        // commandEncoder.copyBufferToBuffer(
        //     resultsBuffer /* source buffer */,
        //     0 /* source offset */,
        //     gpuReadBuffer /* destination buffer */,
        //     0 /* destination offset */,
        //     resultsBufferSize /* size */
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

    requestAnimationFrame(draw);

}
