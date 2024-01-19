import { vec3, mat4 } from "gl-matrix";
import { AddColors } from "./colorMap";


export interface meshObj {
    vertexs: Float32Array,
    indexs:  Uint32Array,
    normals: Float32Array,
    meshType: string,
    voiInitValues: Float32Array,
    stim_params: Float32Array,
    connections: Uint32Array,
    fibers_long: Float32Array
}

export const getDataFromDjango = (data:any) =>{
    const vertexs = new Float32Array(data.vertexs)
    const indexs = new Uint32Array(data.cells)
    const normals = new Float32Array(data.normals);
    const voiInitValues = new Float32Array(data.voiInitValues);
    const stim_params = new Float32Array(data.stim_params);
    const connections = new Uint32Array(data.connections);
    const fibers_long = new Float32Array(data.fibers_long);
    const meshType = data.meshType;
    var meshData:meshObj = {
        vertexs: vertexs,
        indexs:  indexs,
        normals: normals,
        meshType: meshType,
        voiInitValues: voiInitValues,
        stim_params: stim_params,
        connections: connections,
        fibers_long: fibers_long,
    }
    return meshData;
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
    // const adapter = await navigator.gpu.requestAdapter() as GPUAdapter;

    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
        forceFallbackAdapter: false
    }) as GPUAdapter;
    console.log(adapter.isFallbackAdapter);
    console.log(adapter.limits);
    const adapterInfo = await adapter.requestAdapterInfo() as GPUAdapterInfo;
    console.log(adapterInfo);
    const device = await adapter.requestDevice() as GPUDevice;
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