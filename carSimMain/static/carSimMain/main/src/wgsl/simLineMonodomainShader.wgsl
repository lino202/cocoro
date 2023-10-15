//COMPUTE SHADER ---------------------------------------------------

struct SimParams {
    dt     : f32,
    lambda : f32,
    cm     : f32,
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

@compute @workgroup_size(64)
fn comp_monodomain_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    
    //Check for overcomputing and simulation stop
    //Maybe the stop need to be done in the draw function as the data is keep being passed to the gpu TODO
    let idx = GlobalInvocationID.x; 
    if((idx >= arrayLength(&vois)) | (sim_params.dt <= 0.)) {return;}
    params[idx].sim_dt += sim_params.dt;


    //Monodomain Step 1, diffusion, set neumann condition for the extremes of the line
    if (idx >= arrayLength(&vois)-1) {
        vois[idx] =  vois[idx] + ( (sim_params.dt/2) * sim_params.lambda * ( 2 * vois[idx-1] - 2 * vois[idx] ) );
    }else if (idx==0) {
        vois[idx] =  vois[idx] + ( (sim_params.dt/2) * sim_params.lambda * ( 2 * vois[idx+1] - 2 * vois[idx] ) );
    }else{
        vois[idx] =  vois[idx] + ( (sim_params.dt/2) * sim_params.lambda * (vois[idx-1] - 2 * vois[idx] + vois[idx+1]) );
    }


    // Monodomain Step 2, reaction, get i_stim
    var i_stim:f32 = 0;
    if ((params[idx].stim_period != 0.) & (params[idx].sim_dt >= params[idx].stim_period)){
        // results[idx] = params[idx].sim_dt % params[idx].stim_period;
        if ((params[idx].sim_dt % params[idx].stim_period) < params[idx].stim_dur){
            i_stim = params[idx].stim_amp;
        }
    }
    var i_ion:f32 = 0; //TODO 
    vois[idx] =  vois[idx] - ((i_ion + i_stim) * sim_params.dt / sim_params.cm) ;

    
    //Monodomain Step 1, diffusion, set neumann condition for the extremes of the line
    if (idx >= arrayLength(&vois)-1) {
        vois[idx] =  vois[idx] + ( (sim_params.dt/2) * sim_params.lambda * ( 2 * vois[idx-1] - 2 * vois[idx] ) );
    }else if (idx==0) {
        vois[idx] =  vois[idx] + ( (sim_params.dt/2) * sim_params.lambda * ( 2 * vois[idx+1] - 2 * vois[idx] ) );
    }else{
        vois[idx] =  vois[idx] + ( (sim_params.dt/2) * sim_params.lambda * (vois[idx-1] - 2 * vois[idx] + vois[idx+1]) );
    }
    
}

