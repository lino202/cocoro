import { vec3, mat4 } from "gl-matrix";

export interface LightInputsInterface {
    color?: string;
    ambientIntensity?: string;
    diffuseIntensity?: string;
    specularIntensity?: string;
    shininess?: string;
    specularColor?: string;
    isTwoSideLighting?: string;
} 

export interface MeshObj {
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

export interface ElectrodesObj {
    actual_points: Float32Array,
}

export interface DebugSettingsObj {
    start: number,
    end:  number,
    state_name: string
}

export interface SaveSettingsObj {
    start: number,
    end:  number,
    save_name: string
}

export interface ExtraCanvases {
    cellVar: HTMLCanvasElement | undefined,
    pECG: HTMLCanvasElement | undefined
}

export interface CellObj {
    cellModel: string,
    states: Record<string,number>,
    constants: Record<string,number>,
    stim: Record<string,number>
}

export interface VisualParams {
    min   : number,
    max   : number,
    [key: string]: any;  // Allows extra properties
}

export interface CameraOption{
    eye: vec3,
    center: vec3,
    zoomMax: number,
    zoomSpeed: number
}

export interface ViewProjection{
    viewMatrix: mat4,
    projectionMatrix: mat4,
    viewProjectionMatrix: mat4,
    cameraOption: CameraOption
}