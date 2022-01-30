import { initGPU, createGPUBuffer, createTransforms, createViewProjection, checkWebGPU, createAnimation,getDataFromDjango, createGPUBufferUint } from './helper';
import Shaders from './shaders.wgsl';
import { mat4, vec3 } from 'gl-matrix';
const createCamera =require('3d-view-controls')

// Light model parameters
export interface LightInputs {
    color?: string;
    ambientIntensity?: string;
    diffuseIntensity?: string;
    specularIntensity?: string;
    shininess?: string;
    specularColor?: string;
} 


export const CreateShapeWithLight = async (djangodata:any, li:LightInputs, isAnimation = false) => {
    const gpu = await initGPU();
    const device = gpu.device;

    // define default input values:
    li.color = li.color == undefined ? '0.0, 1.0, 0.0' : li.color;
    li.ambientIntensity = li.ambientIntensity == undefined ? '0.2' : li.ambientIntensity;
    li.diffuseIntensity = li.diffuseIntensity == undefined ? '0.8' : li.diffuseIntensity;
    li.specularIntensity = li.specularIntensity == undefined ? '0.2' : li.specularIntensity;
    li.shininess = li.shininess == undefined ? '30.0' : li.shininess;
    li.specularColor = li.specularColor == undefined ? '1.0, 1.0, 1.0' : li.specularColor;

    // create vertex buffers
    const meshData = getDataFromDjango(djangodata);
    const numberOfVertices = meshData.indexs.length;
    const vertexBuffer = createGPUBuffer(device, meshData.vertexs);
    const normalBuffer = createGPUBuffer(device, meshData.normals);
    const indexBuffer = createGPUBufferUint(device, meshData.indexs);
 

    const pipeline = device.createRenderPipeline({
        vertex: {
            module: device.createShaderModule({                    
                code: Shaders
            }),
            entryPoint: "vs_main",
            buffers:[
                {
                    arrayStride: 12,
                    attributes: [
                        {
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0
                        }
                    ]
                },
                {
                    arrayStride: 12,
                    attributes: [{
                        shaderLocation: 1,
                        format: "float32x3",
                        offset: 0
                    }]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({                    
                code: Shaders
            }),
            entryPoint: "fs_main",
            targets: [
                {
                    format: gpu.format as GPUTextureFormat
                }
            ]
        },
        primitive:{
            topology: "triangle-list",
            // cullMode: 'back' No se que es
        },
        depthStencil:{
            format: "depth24plus",
            depthWriteEnabled: true,
            depthCompare: "less"
        }
    });

    // create uniform data
    const normalMatrix = mat4.create();
    const modelMatrix = mat4.create();
    // const mvpMatrix = mat4.create();
    let vMatrix = mat4.create();
    let vpMatrix = mat4.create();
    const vp = createViewProjection(gpu.canvas.width/gpu.canvas.height);
    vpMatrix = vp.viewProjectionMatrix;

    // add rotation and camera:
    let rotation = vec3.fromValues(0, 0, 0);       
    var camera = createCamera(gpu.canvas, vp.cameraOption);
    let eyePosition = new Float32Array(vp.cameraOption.eye);
    let lightPosition = eyePosition;


    const vertexUniformBuffer = device.createBuffer({
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
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(colorUniformBuffer, 0, new Float32Array(li.color?.split(',').map(Number)!));
    device.queue.writeBuffer(colorUniformBuffer, 16, new Float32Array(li.specularColor?.split(',').map(Number)!));

    // get realiable light parameters and associated with the correct buffer and passed to the device
    const lightParams = new Float32Array([
        parseFloat(li.ambientIntensity?.toString()!),
        parseFloat(li.diffuseIntensity?.toString()!),
        parseFloat(li.specularIntensity?.toString()!),
        parseFloat(li.shininess?.toString()!),
    ]);
    device.queue.writeBuffer(lightUniformBuffer, 0, lightParams);

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: vertexUniformBuffer,
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
                    size: 16
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
            loadValue: { r: 0.5, g: 0.5, b: 0.8, a: 1.0 }, //background color
            storeOp: 'store'
        }],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadValue: 1.0,
            depthStoreOp: "store",
            stencilLoadValue: 0,
            stencilStoreOp: "store"
        }
    };
    
    function draw() {
        
        if(camera.tick()){
            const pMatrix = vp.projectionMatrix;
            vMatrix = camera.matrix;
            mat4.multiply(vpMatrix, pMatrix, vMatrix);
            
            eyePosition = new Float32Array(camera.eye.flat());
            lightPosition = eyePosition;
            device.queue.writeBuffer(vertexUniformBuffer, 0, vpMatrix as ArrayBuffer);
            device.queue.writeBuffer(fragmentUniformBuffer, 0, eyePosition);
            device.queue.writeBuffer(fragmentUniformBuffer, 16, lightPosition);
        }
        
        
        // createTransforms(modelMatrix,[0,0,0], rotation);
        // mat4.multiply(mvpMatrix, vpMatrix, modelMatrix);
        // device.queue.writeBuffer(uniformBuffer, 0, mvpMatrix as ArrayBuffer);
        
        createTransforms(modelMatrix,[0,0,0], rotation);
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        device.queue.writeBuffer(vertexUniformBuffer, 64, modelMatrix as ArrayBuffer);
        device.queue.writeBuffer(vertexUniformBuffer, 128, normalMatrix as ArrayBuffer);

        
        textureView = gpu.context.getCurrentTexture().createView();
        renderPassDescription.colorAttachments[0].view = textureView;
        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass(renderPassDescription as GPURenderPassDescriptor);

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, normalBuffer);
        renderPass.setIndexBuffer(indexBuffer, 'uint32');
        renderPass.setBindGroup(0, uniformBindGroup);
        renderPass.drawIndexed(numberOfVertices);
        renderPass.endPass();

        device.queue.submit([commandEncoder.finish()]);
    }

    createAnimation(draw, rotation, isAnimation);

}
