#include "./common.wgsl";

struct States {
    u  : f32,
    v  : f32,
    w  : f32,
    vm : f32,
    t: f32,
}

struct Constants {
    cm           : f32,
    V_0          : f32,
    V_fi         : f32,
    u_c          : f32,
    u_csi        : f32,
    k            : f32,
    u_v          : f32,
    g_fi_max     : f32,
    tau_v1_minus : f32,
    tau_v2_minus : f32,
    tau_v_plus   : f32,
    tau_0        : f32,
    tau_r        : f32,
    tau_si       : f32,
    tau_w_minus  : f32,
    tau_w_plus   : f32,
}

@binding(0) @group(0) var<storage, read_write> vois : array<f32>;
@binding(1) @group(0) var<storage, read_write> states : States;
@binding(2) @group(0) var<uniform> constants : Constants;
@binding(3) @group(0) var<uniform> stim : Stim;
@binding(4) @group(0) var<uniform> integ : Integration;
@binding(5) @group(0) var<uniform> visual_params : VisualParams;
// @binding(6) @group(0) var<storage, read_write> results : array<f32>;

// var<private> tau_d:f32 = constants.cm / constants.g_fi_max;
// var<private> t: f32 = 0.0;  // This cannot be done the variable t is not saved after shader execution;
var<private> current_compute_interval: f32;


fn piecewise(a:f32, b:f32) -> f32{
    if (a<b){
        return 0.00000;
    }else{
        return 1.00000;
    }
}


@compute @workgroup_size(64)
fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
    
    //Check for overcomputing and simulation stop
    let idx = GlobalInvocationID.x; 
    if((idx >= arrayLength(&vois)) | (integ.dt <= 0.)) {return;}

    // Vois not in the right tip of the line should just switch the value
    if (idx <= (arrayLength(&vois)-2)) {
        vois[idx] = vois[idx+1];
        return;    
    }
    
    // But for the last voi in the right tip of the line we compute the Vm
    current_compute_interval = trunc(states.t/visual_params.plot_dt);

    loop {
    
        // Get the stimulation
        var i_stim:f32 = 0.0;
        if ((states.t >= stim.start) & (states.t < stim.start+stim.dur)){i_stim = -stim.amp;}
        if ((states.t >= stim.period+stim.start) & (((states.t - stim.start) % stim.period) < stim.dur)){i_stim = -stim.amp;}

        //Compute the actual cell model
        var tau_d:f32 = constants.cm / constants.g_fi_max;

        let p:f32 = piecewise(states.u, constants.u_c);
        let ddt_w:f32 = ( (1.00000 - p) * (1.00000 - states.w)) /constants.tau_w_minus - ( p * states.w) / constants.tau_w_plus;
        let q:f32 = piecewise(states.u, constants.u_v);
        let tau_v_minus:f32 = q * constants.tau_v1_minus + (1.00000 - q) * constants.tau_v2_minus;
        let ddt_v:f32 = ( (1.00000 - p) * (1.00000 - states.v)) / tau_v_minus - ( p * states.v) / constants.tau_v_plus;
        let J_fi:f32  = (  - states.v * p * (1.00000 - states.u) * (states.u - constants.u_c)) / tau_d;
        let J_so:f32  = ( states.u * (1.00000 - p)) / constants.tau_0 + p / constants.tau_r;
        let J_si:f32  = (  - states.w * (1.00000 + tanh( constants.k * (states.u - constants.u_csi)))) / ( 2.00000 * constants.tau_si);
        i_stim = i_stim / (constants.cm * (constants.V_fi - constants.V_0)); // define local Istim from external in uA/cm2
        let ddt_u:f32 =  - (J_fi + J_so + J_si + i_stim);

        // Update with Fordward Euler 
        states.w = states.w + integ.dt * ddt_w;
        states.v = states.v + integ.dt * ddt_v;
        states.u = states.u + integ.dt * ddt_u;
        
        // Get ionic current
        let ddt_Vm:f32 = ddt_u * (constants.V_fi - constants.V_0);
        let i_ion:f32 = -((ddt_Vm * constants.cm) + i_stim);

        // In case we need the Vm directly we can use this but I prefer to get
        // Iion for clarity of where currents are acting
        // states.Vm = constants.V_0+ states.u.*(constants.V_fi - constants.V_0);

        states.vm = states.vm - ((i_ion + i_stim)* integ.dt / constants.cm);
        vois[idx] = states.vm;

        states.t += integ.dt;

        if (vois[idx] < 3.40282346638528859812e+38f){ //Check for overflow, nan or inf positive oder negative
            vois[idx] = ((vois[idx] - visual_params.voi_min) / (visual_params.voi_max - visual_params.voi_min)) * 2 - 1;
        }else{
            vois[idx] = 1.0; //Plot a line in the top if this overflows
        }

        if ( trunc(states.t/visual_params.plot_dt) != current_compute_interval) {break;}
    }
    // results[idx] = vois[idx];
}




