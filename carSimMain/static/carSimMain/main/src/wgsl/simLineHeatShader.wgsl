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

