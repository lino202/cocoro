import { fentonKarmaDefinitions, fentonKarmaCoreCompute } from '../cellular_shaders/fenton_karma_wgsl.js'
import { gaurDefinitions, gaurCoreCompute} from '../cellular_shaders/gaur_wgsl.js'

export function computeShaderMonodomainLine(cellModel) {

    var specificDefinitions;
    var specificComputeCore;
    if (cellModel == 'Fenton_Karma'){
        specificDefinitions = fentonKarmaDefinitions;
        specificComputeCore = fentonKarmaCoreCompute('Tissue');
    }else if (cellModel == 'Gaur'){
        specificDefinitions = gaurDefinitions;
        specificComputeCore = gaurCoreCompute('Tissue');
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }
    

    return /*wgsl*/`

        struct Integration {
            dt : f32,
            dx : f32
        }

        struct Stim {
            period : f32,
            amp: f32,
            dur: f32,
            start: f32
        }

        struct VisualParams {
            voi_max : f32,
            voi_min : f32,
            plot_dt : f32,        
        };

        ${specificDefinitions}

        @binding(0) @group(0) var<storage, read_write> vois : array<f32>;
        @binding(1) @group(0) var<storage, read_write> stim : array<Stim>;
        @binding(2) @group(0) var<storage, read_write> states : array<States>;
        @binding(3) @group(0) var<uniform>             constants : Constants;
        @binding(4) @group(0) var<uniform>             integ : Integration;
        @binding(5) @group(0) var<uniform>             visual_params : VisualParams;
        // @binding(6) @group(0) var<storage, read_write> results : array<f32>;

        var<private> current_compute_interval: f32;

        @compute @workgroup_size(64)
        fn comp_monodomain_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx >= arrayLength(&vois)) | (integ.dt <= 0.)) {return;}

            // But for the last voi in the right tip of the line we compute the Vm
            current_compute_interval = trunc(states[idx].t/visual_params.plot_dt);

            // we compute the lambda constant that should be used in this time step, 
            // 10e5 is the number resulting from scaling lambda to [1/ms] 
            let lambda:f32 = (constants.sigma_long * 100000) / (integ.dx*integ.dx * constants.beta * constants.cm); 

            // Compute the Monodomain equation 
            loop{

                //Monodomain Step 1, diffusion, set neumann condition for the extremes of the line
                if (idx >= arrayLength(&vois)-1) {
                    states[idx].vm =  states[idx].vm + ( (integ.dt/2) * lambda * ( 2 * states[idx-1].vm - 2 * states[idx].vm ) );
                }else if (idx==0) {
                    states[idx].vm =  states[idx].vm + ( (integ.dt/2) * lambda * ( 2 * states[idx+1].vm - 2 * states[idx].vm ) );
                }else{
                    states[idx].vm =  states[idx].vm + ( (integ.dt/2) * lambda * (states[idx-1].vm - 2 * states[idx].vm + states[idx+1].vm) );
                }


                // Monodomain Step 2, reaction, get i_stim
                // Get the stimulation
                var i_stim:f32 = 0.0;
                if ((states[idx].t >= stim[idx].start) & (states[idx].t < stim[idx].start+stim[idx].dur)){i_stim = -stim[idx].amp;}
                if ((states[idx].t >= stim[idx].period+stim[idx].start) & (((states[idx].t - stim[idx].start) % stim[idx].period) < stim[idx].dur)){i_stim = -stim[idx].amp;}
                
                // Define the curr_Iion
                ${specificComputeCore}
                // Here we take into account the following:
                // We defined Beta, Cm and the sigma_long in the constants of the cell model
                // if we think logically those are common params to the cell type that can be defining one single cell
                // or tissue with unique cellType. So constants are unique for all nodes but the states should be repetead for all nodes -> array
                states[idx].vm =  states[idx].vm - ((curr_Iion + i_stim) * integ.dt / constants.cm) ;
                
                //Monodomain Step 3, diffusion, set neumann condition for the extremes of the line
                if (idx >= arrayLength(&vois)-1) {
                    states[idx].vm =  states[idx].vm + ( (integ.dt/2) * lambda * ( 2 * states[idx-1].vm - 2 * states[idx].vm ) );
                }else if (idx==0) {
                    states[idx].vm =  states[idx].vm + ( (integ.dt/2) * lambda * ( 2 * states[idx+1].vm - 2 * states[idx].vm ) );
                }else{
                    states[idx].vm =  states[idx].vm + ( (integ.dt/2) * lambda * (states[idx-1].vm - 2 * states[idx].vm + states[idx+1].vm) );
                }

                states[idx].t += integ.dt;

                if ( trunc(states[idx].t/visual_params.plot_dt) != current_compute_interval) {break;}

            }

            //TODO Is strange but for the FentonKarma model we get extra negative (under MDP) Vm in the extremes
            // Put the Vm graph of one node and do 2D and 3D

            //Pass to vois and normalize to plot    
            //Normalize for visualization
            // Of vm is out of the Voi max min range we would have a magenta color
            vois[idx] = (states[idx].vm - visual_params.voi_min) / (visual_params.voi_max - visual_params.voi_min);                  
            // results[idx] = states[idx].vm;
            
        }
    `;
}



