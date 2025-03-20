import { fentonKarmaDefinitions, fentonKarmaCoreCompute } from './fenton_karma_wgsl.js'
import { gaurDefinitions, gaurCoreCompute} from './gaur_wgsl.js'

export function computeCellModel(cellModel, saveStart, debugStart, debugStateName, bindingNumber) {

    var specificDefinitions;
    var specificComputeCore;
    if (cellModel == 'Fenton_Karma'){
        specificDefinitions = fentonKarmaDefinitions;
        specificComputeCore = fentonKarmaCoreCompute('Cellular');
    }else if (cellModel == 'Gaur'){
        specificDefinitions = gaurDefinitions;
        specificComputeCore = gaurCoreCompute('Cellular');
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }

    // Manage save and debug buffers/arrays
    var saveBufferDefinition = ``;
    var saveBufferAction = ``;
    if (saveStart >= 0){
        saveBufferDefinition = `@binding(${bindingNumber}) @group(0) var<storage, read_write> save_value : f32;`;
        saveBufferAction = `save_value = states.vm;`;
    }
    var debugBufferDefinition = ``;
    var debugBufferAction = ``;
    if (debugStart >= 0){
        if (saveStart >= 0){
            debugBufferDefinition = `@binding(${bindingNumber+1}) @group(0) var<storage, read_write> debug_value : f32;`;
        }else{
            debugBufferDefinition = `@binding(${bindingNumber}) @group(0) var<storage, read_write> debug_value : f32;`;
        }
        debugBufferAction = `debug_value = states.${debugStateName};`;
    }

    return /*wgsl*/`

        struct Stim {
            period : f32,
            amp: f32,
            dur: f32,
            start: f32
        }

        struct Integration {
            dt : f32,
        }

        struct VisualParams {
            plot_dt : f32,
        }

        ${specificDefinitions}
  
        @binding(0) @group(0) var<storage, read_write> states : States;
        @binding(1) @group(0) var<uniform>             constants : Constants;
        @binding(2) @group(0) var<storage, read>       stim : Stim;
        @binding(3) @group(0) var<uniform>             integ : Integration;
        @binding(4) @group(0) var<uniform>             visual_params : VisualParams;
        ${saveBufferDefinition}
        ${debugBufferDefinition}
  
        var<private> current_compute_interval: f32;

        @compute @workgroup_size(1)
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx != 0) | (integ.dt <= 0.)) {return;}
            
            // But for the last voi in the right tip of the line we compute the Vm
            current_compute_interval = trunc(states.t/visual_params.plot_dt);

            // Compute
            loop { 
            
                // Get the stimulation
                var i_stim:f32 = 0.0;
                if ((states.t >= stim.start) & (states.t < stim.start+stim.dur)){i_stim = -stim.amp;}
                if ((states.t >= stim.period+stim.start) & (((states.t - stim.start) % stim.period) < stim.dur)){i_stim = -stim.amp;}

                ${specificComputeCore}

                states.vm = states.vm - ((curr_Iion + i_stim)* integ.dt / constants.cm); // i_stim is negative and uA/cm2, so Iion should be in uA/cm2

                states.t += integ.dt;

                if ( trunc(states.t/visual_params.plot_dt) != current_compute_interval) {break;}
            }

            ${saveBufferAction}
            ${debugBufferAction}

        }

    `;

}