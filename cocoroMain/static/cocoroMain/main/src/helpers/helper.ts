import { vec3, mat4 } from "gl-matrix";

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
    dx: number,
    vertexs_min_bb: Float32Array,
    vertexs_max_bb: Float32Array
}

export interface electrodesObj {
    actual_points: Float32Array,
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

export interface extraCanvases {
    cellVar: HTMLCanvasElement | undefined,
    pECG: HTMLCanvasElement | undefined
}

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
    const extraCanvases:extraCanvases = getSelectedCanvases();

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


export function repeatFloat32Array(arr: Float32Array, n: number): Float32Array {
    const concatenatedArray = new Float32Array(arr.length * n);

    for (let i=0; i<n;i++){
        concatenatedArray.set(arr, i*arr.length);    
    }

    return concatenatedArray;
}

function getSelectedCanvases(){
    const cellVarCanvas = document.getElementById('cell_var_canvas') as HTMLCanvasElement;
    const pECGCanvas = document.getElementById('pECG_canvas') as HTMLCanvasElement;

    const cellVarBox = document.getElementById('cell_var_checkbox') as HTMLInputElement;
    const pECGBox = document.getElementById('pECG_checkbox') as HTMLInputElement;

    var selectedCanvases:extraCanvases = {'cellVar': undefined, 'pECG': undefined};
    if (cellVarBox?.checked) {
        selectedCanvases.cellVar = cellVarCanvas;
    }
    if (pECGBox?.checked) {
        selectedCanvases.pECG = pECGCanvas;
    }
    return selectedCanvases;
};