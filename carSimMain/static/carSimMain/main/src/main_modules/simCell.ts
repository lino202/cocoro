import { initGPU, createGPUBuffer} from '../helpers/helper';
import { createGPUBufferUint } from '../helpers/helper';
import renderShaders from '../wgsl/plot2DShaders.wgsl';
import { initCanvas, setY, setX } from '../helpers/axis';
import { GUI } from 'dat.gui';


function randomWalk(initial: number, walkSize: number): Float32Array {
    const y = new Float32Array(walkSize);
    y[0] = initial + 0.01 * (Math.round(Math.random()) - 0.5);
    for (let i = 1; i < walkSize; i++) {
      y[i] = y[i - 1] + 0.01 * (Math.round(Math.random()) - 0.5);
    }
    return y;
}


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

function simpleFunction(numPoints: number): Float32Array {
    const xy = new Float32Array(numPoints*2);
    
    // var j = 0;
    for (let i = 0; i < numPoints*2; i=i+2) {
      xy[i] = i/numPoints -1;
      xy[i+1] = 0.0;
    //   j++;
    }
    return xy;
}


function getNewValueArray(vertexs: Float32Array): Float32Array{
    var newValue = vertexs[vertexs.length - 1] + 0.01 * (Math.round(Math.random()) - 0.5);
    var newVertexs = Float32Array.from(vertexs);
    
    for (let i = vertexs.length-1; i>0; i=i-2){
        if (i != vertexs.length-1){
            newVertexs[i] = vertexs[i+2];   
        }else{
            newVertexs[vertexs.length-1] = newValue;
        }
        
    }

    return newVertexs;
}


// This simulates line without Light as it is not neccessary
// Voi refers to Variable of interest
export const SimCell = async (gui: GUI) => {
    console.log("RENDERING PLOT AND SIMULATING CELL MODEL:");
    console.log(gui.__folders.Simulation.__controllers[0].getValue())
    const gpu = await initGPU();
    const device = gpu.device;

    const numPoints = 300;
    const indexs = getIndexesForLine(numPoints);
    var vertexs   = simpleFunction(numPoints);

    //Get canvases for axes
    const canvasX = document.getElementById("canvas_xAxis") as HTMLCanvasElement;
    const canvasY = document.getElementById("canvas_yAxis") as HTMLCanvasElement; 

    const ctxX = initCanvas(canvasX);
    const ctxY = initCanvas(canvasY);
    const ymax = gui.__folders.Visualization.__controllers[1].getValue();
    const ymin = gui.__folders.Visualization.__controllers[0].getValue()

    if (ctxY) {setY(ctxY, canvasY.width, canvasY.height, ymin, ymax, 10);}
    if (ctxX) {setX(ctxX, canvasX.width, canvasX.height, 0, numPoints, 10);}

    // create buffers
    const numberOfIndexes  = indexs.length;
    const numberOfVertices = numPoints;
    const vertexBuffer     = createGPUBuffer(device, vertexs);
    const indexBuffer      = createGPUBufferUint(device, indexs);
    
    // RENDER PIPELINE ---------------------------------------------------
    // We need to set the render pipeline
    const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
        module: device.createShaderModule({                    
            code: renderShaders
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
            }
        ]
    },
    fragment: {
        module: device.createShaderModule({                    
            code: renderShaders
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


    // const plotPropertiesBuffer = device.createBuffer({
    //     size: Float32Array.BYTES_PER_ELEMENT * 4, // scale and offset for x and y
    //     usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    // });

    // const renderBindGroup = device.createBindGroup({
    //     layout: renderPipeline.getBindGroupLayout(0),
    //     entries: [
    //         {
    //             binding: 0,
    //             resource: {
    //                 buffer: plotPropertiesBuffer,
    //                 offset: 0,
    //                 size: Float32Array.BYTES_PER_ELEMENT * 4
    //             }
    //         }           
    //     ]
    // });

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
    
    //Draw function for updating data on canvas and triggering gpu updates
    function draw() {

        vertexs = getNewValueArray(vertexs);
        
        //Update signal
        device.queue.writeBuffer(
            vertexBuffer,
            0,
            vertexs
        );


        //Generate the command encoder for both pipelines (Render and Compute)
        //and send them to the gpu
        const commandEncoder = device.createCommandEncoder();
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.setIndexBuffer(indexBuffer, 'uint32');
        // passEncoder.setBindGroup(0, renderBindGroup);
        passEncoder.drawIndexed(numberOfIndexes);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(draw);

    }

    requestAnimationFrame(draw);

}
