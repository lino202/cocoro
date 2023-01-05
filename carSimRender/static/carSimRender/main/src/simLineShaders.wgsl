//VERTEX SHADER ---------------------------------------------------
fn color_map_turbo(x : f32) ->  vec3<f32> {
    const kRedVec4   = vec4<f32>(0.13572138, 4.61539260, -42.66032258, 132.13108234);
    const kGreenVec4 = vec4<f32>(0.09140261, 2.19418839, 4.84296658, -14.18503333);
    const kBlueVec4  = vec4<f32>(0.10667330, 12.64194608, -60.58204836, 110.36276771);
    const kRedVec2   = vec2<f32>(-152.94239396, 59.28637943);
    const kGreenVec2 = vec2<f32>(4.27729857, 2.82956604);
    const kBlueVec2  = vec2<f32>(-89.90310912, 27.34824973);
  
    var x_clamped = clamp(x,0.0,1.0); 
    var v4 = vec4<f32>( 1.0, x_clamped, x_clamped * x_clamped, x_clamped * x_clamped * x_clamped);
    var v2 = v4.zw * v4.z;
    return vec3<f32>(
        dot(v4, kRedVec4)   + dot(v2, kRedVec2),
        dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
        dot(v4, kBlueVec4)  + dot(v2, kBlueVec2)
    );
}

fn color_map_viridis(x : f32) -> vec3<f32> {

    const c0 = vec3<f32>(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);
    const c1 = vec3<f32>(0.1050930431085774, 1.404613529898575, 1.384590162594685);
    const c2 = vec3<f32>(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);
    const c3 = vec3<f32>(-4.634230498983486, -5.799100973351585, -19.33244095627987);
    const c4 = vec3<f32>(6.228269936347081, 14.17993336680509, 56.69055260068105);
    const c5 = vec3<f32>(4.776384997670288, -13.74514537774601, -65.35303263337234);
    const c6 = vec3<f32>(-5.435455855934631, 4.645852612178535, 26.3124352495832);

    return c0+x*(c1+x*(c2+x*(c3+x*(c4+x*(c5+x*c6)))));

}


struct VertexUniforms {
    viewProjectionMatrix : mat4x4<f32>,
    modelMatrix : mat4x4<f32>,               
    normalMatrix : mat4x4<f32>,            
};
@binding(0) @group(0) var<uniform> vertex_uniforms : VertexUniforms;

struct VisualParams {
    voiMax : f32,
    voiMin : f32          
};
@binding(1) @group(0) var<uniform> visual_params : VisualParams;


struct Output {
    @builtin(position) Position : vec4<f32>,
    @location(0) vPosition : vec4<f32>,
    @location(1) vNormal : vec4<f32>,
    @location(2) vColor : vec3<f32>,
};

@vertex
fn vs_main (@location(0) position: vec4<f32>, @location(1) normal: vec4<f32>, @location(2) voi: f32) -> Output {    
    var output: Output;            
    let mPosition:vec4<f32> = vertex_uniforms.modelMatrix * position; 
    output.vPosition = mPosition;                  
    output.vNormal =  vertex_uniforms.normalMatrix * normal;
    output.Position = vertex_uniforms.viewProjectionMatrix * mPosition;

    //Get vertex color [0-1] based on normalized VoI computed in compute shader
    //Normalize for visualization
    let voiNorm = (voi - visual_params.voiMin) / (visual_params.voiMax - visual_params.voiMin);                  
    output.vColor = color_map_turbo(voiNorm); 
    return output;
}

//FRAGMENT SHADER ---------------------------------------------------
@fragment
fn fs_main (@location(2) vColor: vec3<f32>) ->  @location(0) vec4<f32> {
    return vec4<f32>(vColor, 1.0);
}

//COMPUTE SHADER ---------------------------------------------------

struct SimParams {
    dt     : f32,
    lambda : f32
}

struct NodeParams {
  stim_period : f32,
  sim_dt: f32,
  stim_amp: f32,
  stim_dur: f32,
}

@binding(0) @group(0) var<storage, read_write> vois : array<f32>;
@binding(1) @group(0) var<storage, read_write> params : array<NodeParams>;
@binding(2) @group(0) var<uniform> sim_params : SimParams;
// @binding(2) @group(0) var<storage, read_write> results : array<f32>;

//Heat 
// const dt      : f32 = 0.01;
// const k       : f32 = 0.05;  //Diff termica [cm2/s]
// const dx      : f32 = 0.1;
// const lambda  : f32 = k * dt/(dx*dx) ;

@compute @workgroup_size(64)
fn comp_heat_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    
    //Check for overcomputing and simulation stop
    //Maybe the stop need to be done in the draw function as the data is keep being passed to the gpu TODO
    let idx = GlobalInvocationID.x; 
    if((idx >= arrayLength(&vois)) | (sim_params.dt <= 0.)) {return;}
    params[idx].sim_dt += sim_params.dt;

    
    //TODO Separate vertex and fragment shader from compute that should be specific for every mesh type and problem
    //TODO see if we can implement cellular model and put it in different files and import them to the compute shader
    //TODO select node for seing voi maybe another over time
    //TODO select node for stimulation 
    //TODO 2D finite differences
    //TODO fem
    //TODO PECG
    //TODO Add other colormaps and selections
    
    //If one node in the extremes is stimulated the value is maintain as 
    //line's extremes are not updated
    if ((params[idx].stim_period != 0.) & (params[idx].sim_dt >= params[idx].stim_period)){
        // results[idx] = params[idx].sim_dt % params[idx].stim_period;
        if ((params[idx].sim_dt % params[idx].stim_period) < params[idx].stim_dur){
            vois[idx] = params[idx].stim_amp;
            return;
        }
    }

    //Avoid extremes of line and compute Heat equation
    if((idx >= arrayLength(&vois)-1) || (idx==0)) {return;}
    vois[idx] = vois[idx] + sim_params.lambda * (vois[idx-1] - 2 * vois[idx] + vois[idx+1]);
    
}

