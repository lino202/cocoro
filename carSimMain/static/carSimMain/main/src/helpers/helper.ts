import { vec3, mat4 } from "gl-matrix";
import { AddColors } from "./colorMap";


export interface meshObj {
    vertexs: Float32Array,
    actual_points: Float32Array,
    actual_elems:  Uint32Array,
    render_elems:  Uint32Array,
    normals: Float32Array,
    elementType: string,
    stim_params: Float32Array,
    connections: Uint32Array,
    fibers_long: Float32Array,
    render_points_global_ids: Uint32Array,
    dx: number
}

export interface debugSettingsObj {
    start: number,
    end:  number,
    state_name: string
}

export interface saveSettingsObj {
    start: number,
    end:  number,
    save_name: string
}

export const createAnimation = (draw:any, rotation:vec3 = vec3.fromValues(0,0,0), isAnimation = true ) => {
    function step() {
        if(isAnimation){
            rotation[0] += 0.01;
            rotation[1] += 0.01;
            rotation[2] += 0.01;
        } else{
            rotation = [0, 0, 0];
        }
        draw();
        requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}


export const createTransforms = (modelMat:mat4, translation:vec3 = [0,0,0], rotation:vec3 = [0,0,0], scaling:vec3 = [1,1,1]) => {
    const rotateXMat = mat4.create();
    const rotateYMat = mat4.create();
    const rotateZMat = mat4.create();   
    const translateMat = mat4.create();
    const scaleMat = mat4.create();

    //perform individual transformations
    mat4.fromTranslation(translateMat, translation);
    mat4.fromXRotation(rotateXMat, rotation[0]);
    mat4.fromYRotation(rotateYMat, rotation[1]);
    mat4.fromZRotation(rotateZMat, rotation[2]);
    mat4.fromScaling(scaleMat, scaling);

    //combine all transformation matrices together to form a final transform matrix: modelMat
    mat4.multiply(modelMat, rotateXMat, scaleMat);
    mat4.multiply(modelMat, rotateYMat, modelMat);        
    mat4.multiply(modelMat, rotateZMat, modelMat);
    mat4.multiply(modelMat, translateMat, modelMat);
};

export const createViewProjection = (respectRatio = 1.0, cameraPosition:vec3 = [2, 2, 4], lookDirection:vec3 = [0, 0, 0], 
    upDirection:vec3 = [0, 1, 0]) => {

    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();       
    const viewProjectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, 2*Math.PI/5, respectRatio, 0.1, 100.0);

    mat4.lookAt(viewMatrix, cameraPosition, lookDirection, upDirection);
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

    const cameraOption = {
        eye: cameraPosition,
        center: lookDirection,
        zoomMax: 100,
        zoomSpeed: 2
    };

    return {
        viewMatrix,
        projectionMatrix,
        viewProjectionMatrix,
        cameraOption
    }
};

export const createGPUBufferUint = (device:GPUDevice, data:Uint32Array, 
    usageFlag:GPUBufferUsageFlags = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST) => {
    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });
    new Uint32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
};

export const createGPUBuffer = (device:GPUDevice, data:Float32Array, 
    usageFlag:GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST) => {

    const buffer = device.createBuffer({
        size: data.byteLength,
        usage: usageFlag,
        mappedAtCreation: true
    });

    new Float32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;


}

export const initGPU = async () => {
    const checkgpu = checkWebGPU();
    if(checkgpu.includes("Your current browser does not support WebGPU! :(")){
        console.log(checkgpu);
        throw(checkgpu);
    }

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;

    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',              //Anyways you need to check chrome is using the most powerfull one or has accesibility to both on chip and discrete gpus 
        forceFallbackAdapter: false
    }) as GPUAdapter;

    const adapterLimits = adapter.limits
    console.log(adapterLimits);
    // console.log(adapter.features);
    console.log(adapter.info);

    // Request highest limit
    const device = await adapter.requestDevice({
        requiredLimits: { 
            maxBufferSize:                     adapterLimits.maxBufferSize,
            maxUniformBufferBindingSize:       adapterLimits.maxUniformBufferBindingSize, 
            maxStorageBufferBindingSize:       adapterLimits.maxStorageBufferBindingSize,
            maxComputeInvocationsPerWorkgroup: adapterLimits.maxComputeInvocationsPerWorkgroup,
            maxComputeWorkgroupSizeX:          adapterLimits.maxComputeWorkgroupSizeX,
            maxComputeWorkgroupSizeY:          adapterLimits.maxComputeWorkgroupSizeY,
            maxComputeWorkgroupSizeZ:          adapterLimits.maxComputeWorkgroupSizeZ,
            maxComputeWorkgroupStorageSize:    adapterLimits.maxComputeWorkgroupStorageSize,
            maxComputeWorkgroupsPerDimension:  adapterLimits.maxComputeWorkgroupsPerDimension
        },
    }) as GPUDevice;

    const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
    const devicePixelRatio = window.devicePixelRatio || 1;
    // const size = [
    //     canvas.clientWidth * devicePixelRatio,
    //     canvas.clientHeight * devicePixelRatio,

    // ];
    canvas.width = canvas.clientWidth * devicePixelRatio
    canvas.height = canvas.clientHeight * devicePixelRatio

    const textureFormat = await navigator.gpu.getPreferredCanvasFormat()
    // const format = context.getPreferredFormat(adapter!);
    context.configure({
        device: device,
        format: textureFormat,
        alphaMode: "premultiplied"
    })

    return{device, canvas, textureFormat, context};

}

// This function gets the color map based on the z axis in the node positions
export const GetColorFromVertexs = (vertexs:Float32Array) => {
    let colors: any = [];
    for (let i=0; i<vertexs.length;i=i+3){
        colors.push(AddColors('jet',-1,1,vertexs[i]));
    }
    return new Float32Array(colors.flat());
}

export const checkWebGPU = () => {
    let result = "Great, your current browser supports WebGPU!";
    if (!navigator.gpu) {
        result = "Your current browser does not support WebGPU! :(";
    } 
    return result;
}


export function repeatFloat32Array(arr: Float32Array, n: number): Float32Array {
    const concatenatedArray = new Float32Array(arr.length * n);

    for (let i=0; i<n;i++){
        concatenatedArray.set(arr, i*arr.length);    
    }

    return concatenatedArray;
}