export const fentonKarmaDefinitions = /*wgsl*/`

    struct States {
        u  : f32,
        v  : f32,
        w  : f32,
        vm : f32,
        t  : f32,
        divG_gradV : f32,
    }

    struct Constants {
        cm           : f32,
        beta         : f32,
        sigma_long   : f32,
        sigma_trans_2_long : f32,
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

    fn piecewise(a:f32, b:f32) -> f32{
        if (a<b){
            return 0.00000;
        }else{
            return 1.00000;
        }
    }

`;


export function fentonKarmaCoreCompute(simScale) {

    var statesString;
    if (simScale == 'Cellular'){
        statesString = 'states';
    }else if (simScale == 'Tissue'){
        statesString = 'states[idx]';
    }else{
        throw new Error(`Unknown Simulation Scale "${simScale}"`)
    }
    
    return /*wgsl*/`
        //Compute the actual cell model
        var tau_d:f32 = constants.cm / constants.g_fi_max;

        let p:f32 = piecewise(${statesString}.u, constants.u_c);
        let ddt_w:f32 = ( (1.00000 - p) * (1.00000 - ${statesString}.w)) /constants.tau_w_minus - ( p * ${statesString}.w) / constants.tau_w_plus;
        let q:f32 = piecewise(${statesString}.u, constants.u_v);
        let tau_v_minus:f32 = q * constants.tau_v1_minus + (1.00000 - q) * constants.tau_v2_minus;
        let ddt_v:f32 = ( (1.00000 - p) * (1.00000 - ${statesString}.v)) / tau_v_minus - ( p * ${statesString}.v) / constants.tau_v_plus;
        let J_fi:f32  = (  - ${statesString}.v * p * (1.00000 - ${statesString}.u) * (${statesString}.u - constants.u_c)) / tau_d;
        let J_so:f32  = ( ${statesString}.u * (1.00000 - p)) / constants.tau_0 + p / constants.tau_r;
        let J_si:f32  = (  - ${statesString}.w * (1.00000 + tanh( constants.k * (${statesString}.u - constants.u_csi)))) / ( 2.00000 * constants.tau_si);
        let local_i_stim = i_stim / (constants.cm * (constants.V_fi - constants.V_0)); // define local_i_stim in 1/ms from external i_stim in uA/cm2
        let ddt_u:f32 =  - (J_fi + J_so + J_si + local_i_stim);

        // Update with Fordward Euler 
        ${statesString}.w = ${statesString}.w + integ.dt * ddt_w;
        ${statesString}.v = ${statesString}.v + integ.dt * ddt_v;
        ${statesString}.u = ${statesString}.u + integ.dt * ddt_u;
        
        // Get ionic current
        let ddt_Vm:f32 = ddt_u * (constants.V_fi - constants.V_0);
        let curr_Iion:f32 = -((ddt_Vm * constants.cm) + i_stim); 
        // Pay attention to the local and external i_stim, the external is in uA/cm2 then curr_Iion is in uA/cm2
       
    `;
}