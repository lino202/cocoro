
export const simLineHeatComputeShader = /*wgsl*/`

    struct Integration {
        dt : f32,
        dx : f32
    };

    struct Stim {
        period : f32,
        amp: f32,
        dur: f32,
        start: f32
    };

    struct VisualParams {
        voi_max : f32,
        voi_min : f32, 
        plot_dt : f32     
    };

    struct States {
        t: f32,
    };

    struct Constants {
        lambda : f32
    };

    @binding(0) @group(0) var<storage, read_write> vois          : array<f32>;
    @binding(1) @group(0) var<storage, read_write> stim          : array<Stim>;
    @binding(2) @group(0) var<storage, read_write> states        : array<States>;
    @binding(3) @group(0) var<uniform>             constants     : Constants;
    @binding(4) @group(0) var<uniform>             integ         : Integration;
    @binding(5) @group(0) var<uniform>             visual_params : VisualParams;
    // @binding(6) @group(0) var<storage, read_write> results : array<f32>;

    var<private> current_compute_interval: f32;

    @compute @workgroup_size(64)
    fn comp_heat_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
        
        //Check for overcomputing and simulation stop
        //Maybe the stop need to be done in the draw function as the data is keep being passed to the gpu TODO
        let idx = GlobalInvocationID.x; 
        if((idx >= arrayLength(&vois)) | (integ.dt <= 0.)) {return;}

        current_compute_interval = trunc(states[idx].t/visual_params.plot_dt);

        if ((states[idx].t >= stim[idx].start) & (states[idx].t < stim[idx].start+stim[idx].dur)){
            vois[idx] = stim[idx].amp; 
            return;
        }
        if ((states[idx].t >= stim[idx].period+stim[idx].start) & (((states[idx].t - stim[idx].start) % stim[idx].period) < stim[idx].dur)){
            vois[idx] = stim[idx].amp;
            return;
        }

        

        //Avoid extremes of line and compute Heat equation
        if((idx >= arrayLength(&vois)-1) || (idx==0)) {return;}

        loop{
            vois[idx] = vois[idx] + constants.lambda * (vois[idx-1] - 2 * vois[idx] + vois[idx+1]);
            
            states[idx].t += integ.dt;
            
            if ( trunc(states[idx].t/visual_params.plot_dt) != current_compute_interval) {break;}
        }
        
        vois[idx] = (vois[idx] - visual_params.voi_min) / (visual_params.voi_max - visual_params.voi_min);   
        
    }
`;
