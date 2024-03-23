import { commonStructs, commonCellModelDefinitions } from './common.js';
import { fentonKarmaDefinitions, fentonKarmaCoreCompute } from './fenton_karma_wgsl.js'
import { gaurDefinitions, gaurCoreCompute} from './gaur_wgsl.js'

export function computeCellModel(cellModel) {

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

    return /*wgsl*/`
        ${commonStructs}

        ${specificDefinitions}

        ${commonCellModelDefinitions}

        @compute @workgroup_size(64)
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx >= arrayLength(&vois)) | (integ.dt <= 0.)) {return;}

            // Vois not in the right tip of the line should just switch the value
            if (idx <= (arrayLength(&vois)-2)) {
                // vois[idx] = f32(atomicLoad(&quantized_vm[idx+1])) * DEQUANTIZE_FACTOR;
                // atomicStore(&quantized_vm[idx], i32(vois[idx] * QUANTIZE_FACTOR));
                vois[idx] = vois[idx+1];
                return;    
            }
            
            // But for the last voi in the right tip of the line we compute the Vm
            current_compute_interval = trunc(states.t/visual_params.plot_dt);

            // Compute to complete the plotting resolution dt_plot
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

            // Pass to vois and normalize to plot
            vois[idx] = states.vm;

            if (vois[idx] < 3.40282346638528859812e+38f){ //Check for overflow, nan or inf positive oder negative
                vois[idx] = ((vois[idx] - visual_params.voi_min) / (visual_params.voi_max - visual_params.voi_min)) * 2 - 1;
            }else{
                vois[idx] = 1.0; //Plot a line in the top if this overflows
            }
            // results[idx] = vois[idx];

            // atomicStore(&quantized_vm[idx], i32(vois[idx] * QUANTIZE_FACTOR));
        }

    `;

}