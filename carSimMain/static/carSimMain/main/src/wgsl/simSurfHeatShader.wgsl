//COMPUTE SHADER ---------------------------------------------------

struct SimParams {
    dt     : f32,
    lambda : f32
}

struct NodeParams {
    stim_period : f32,
    stim_amp: f32,
    stim_dur: f32,
    sim_dt: f32,
    relations: vec4<f32>
}

@binding(0) @group(0) var<storage, read_write> vois : array<f32>;
@binding(1) @group(0) var<storage, read_write> params : array<NodeParams>;
@binding(2) @group(0) var<uniform> sim_params : SimParams;
// @binding(2) @group(0) var<storage, read_write> results : array<f32>;

//Heat 
@compute @workgroup_size(64)
fn comp_heat_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    
    //Check for overcomputing and simulation stop
    //Maybe the stop need to be done in the draw function as the data is keep being passed to the gpu TODO
    let idx = GlobalInvocationID.x; 
    if((idx >= arrayLength(&vois)) | (sim_params.dt <= 0.)) {return;}
    params[idx].sim_dt += sim_params.dt;
    
    //If one node in the extremes is stimulated the value is maintain as 
    //line's extremes are not updated
    if ((params[idx].stim_period != 0.) & (params[idx].sim_dt >= params[idx].stim_period)){
        // results[idx] = params[idx].sim_dt % params[idx].stim_period;
        if ((params[idx].sim_dt % params[idx].stim_period) < params[idx].stim_dur){
            vois[idx] = params[idx].stim_amp;
            return;
        }
    }

    //Avoid extremes of square and compute Heat equation
    if(params[idx].relations[0]==-1.) {return;}
    vois[idx] = vois[idx] + sim_params.lambda * (vois[u32(params[idx].relations[0])] + vois[u32(params[idx].relations[1])] + vois[u32(params[idx].relations[2])]+ vois[u32(params[idx].relations[3])] - 4 * vois[idx]);
    
}

