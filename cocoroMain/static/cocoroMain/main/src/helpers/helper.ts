import { vec3, mat4 } from "gl-matrix";
import { ExtraCanvases } from '../helpers/interfaces';

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

export const initGPU = async () => {
    const checkgpu = checkWebGPU();
    if(checkgpu.includes("Your current browser does not support WebGPU! :(")){
        console.log(checkgpu);
        throw(checkgpu);
    }

    const canvas = document.getElementById('canvas-webgpu') as HTMLCanvasElement;
    const extraCanvases:ExtraCanvases = getSelectedCanvases();

    const adapter = await navigator.gpu.requestAdapter({
        // The powerPreference option is currently ignored when calling requestAdapter() on Windows.  
        // See https://crbug.com/369219127    
        // Anyways you need to check chrome is using the most powerfull one or has accesibility to both on chip and discrete gpus
        // powerPreference: 'high-performance', 
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
            maxComputeWorkgroupsPerDimension:  adapterLimits.maxComputeWorkgroupsPerDimension,
            maxStorageBuffersPerShaderStage:   adapterLimits.maxStorageBuffersPerShaderStage,
        },
    }) as GPUDevice;

    // We add extra canvas, but we leave the default order in order to have the main canvas and info useful for the 
    // other functions calling this one, we padded an extra_canvases shit

    // Primary
    const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio
    canvas.height = canvas.clientHeight * devicePixelRatio

    const textureFormat = await navigator.gpu.getPreferredCanvasFormat()
    context.configure({
        device: device,
        format: textureFormat,
        alphaMode: "premultiplied"
    })

    return{device, canvas, textureFormat, context, extraCanvases, adapterLimits};

}

export const checkWebGPU = () => {
    let result = "Great, your current browser supports WebGPU!";
    if (!navigator.gpu) {
        result = "Your current browser does not support WebGPU! :(";
    } 
    return result;
}

function getSelectedCanvases(){
    const cellVarCanvas = document.getElementById('cell_var_canvas') as HTMLCanvasElement;
    const pECGCanvas = document.getElementById('pECG_canvas') as HTMLCanvasElement;

    const cellVarBox = document.getElementById('cell_var_checkbox') as HTMLInputElement;
    const pECGBox = document.getElementById('pECG_checkbox') as HTMLInputElement;

    var selectedCanvases:ExtraCanvases = {'cellVar': undefined, 'pECG': undefined};
    if (cellVarBox?.checked) {
        selectedCanvases.cellVar = cellVarCanvas;
    }
    if (pECGBox?.checked) {
        selectedCanvases.pECG = pECGCanvas;
    }
    return selectedCanvases;
};