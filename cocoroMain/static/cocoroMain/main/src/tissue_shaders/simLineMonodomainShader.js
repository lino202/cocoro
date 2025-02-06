import { fentonKarmaDefinitions, fentonKarmaCoreCompute } from '../cellular_shaders/fenton_karma_wgsl.js'
import { gaurDefinitions, gaurCoreCompute} from '../cellular_shaders/gaur_wgsl.js'

export function computeShaderMonodomainLine(cellModel, nNodes, workgroup_size, saveStart, debugStart, debugStateName) {

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

    // Manage save and debug buffers/arrays
    var saveBufferDefinition = ``;
    var saveBufferAction = ``;
    if (saveStart >= 0){
        saveBufferDefinition = `@binding(6) @group(0) var<storage, read_write> save_array : array<f32>;`;
        saveBufferAction = `save_array[idx] = states[idx].vm;`;
    }
    var debugBufferDefinition = ``;
    var debugBufferAction = ``;
    if (debugStart >= 0){
        if (saveStart >= 0){
            debugBufferDefinition = `@binding(7) @group(0) var<storage, read_write> debug_array : array<f32>;`;
        }else{
            debugBufferDefinition = `@binding(6) @group(0) var<storage, read_write> debug_array : array<f32>;`;
        }
        debugBufferAction = `debug_array[idx] = states[idx].` + debugStateName + `;`;
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

        ${specificDefinitions}

        @binding(0) @group(0) var<storage, read_write> vms : array<f32>;
        @binding(1) @group(0) var<storage, read_write> stim : array<Stim, ${nNodes}>;
        @binding(2) @group(0) var<storage, read_write> states : array<States, ${nNodes}>;
        @binding(3) @group(0) var<uniform>             constants : Constants;
        @binding(4) @group(0) var<uniform>             integ : Integration;
        @binding(5) @group(0) var<storage, read>       vms_copy : array<f32>;
        ${saveBufferDefinition}
        ${debugBufferDefinition}

        @compute @workgroup_size(${workgroup_size})
        fn comp_monodomain_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx >= arrayLength(&vms)) | (integ.dt <= 0.)) {return;}

            // we compute the lambda constant that should be used in this time step, 
            // 10e5 is the number resulting from scaling lambda to [1/ms] 
            let lambda:f32 = (constants.sigma_long * 100000) / (integ.dx*integ.dx * constants.beta * constants.cm); 

            //Compute diffusion
            var d2dxdx_V:f32 = 0.0;
            if (idx >= arrayLength(&vms)-1) {
                d2dxdx_V = ( 2 * vms_copy[idx-1] - 2 * vms_copy[idx] );
            }else if (idx==0) {
                d2dxdx_V = ( 2 * vms_copy[idx+1] - 2 * vms_copy[idx] );
            }else{
                d2dxdx_V = (vms_copy[idx-1] - 2 * vms_copy[idx] + vms_copy[idx+1]);
            }

            // Get the stimulation
            var i_stim:f32 = 0.0;
            if ((states[idx].t >= stim[idx].start) & (states[idx].t < stim[idx].start+stim[idx].dur)){i_stim = -stim[idx].amp;}
            if ((states[idx].t >= stim[idx].period+stim[idx].start) & (((states[idx].t - stim[idx].start) % stim[idx].period) < stim[idx].dur)){i_stim = -stim[idx].amp;}
            
            // // Compute ionic/reaction term by defining the curr_Iion
            // We defined Beta, Cm and the sigma_long in the constants of the cell model
            // if we think logically those are common params to the cell type that can be defining one single cell
            // or tissue with unique cellType. So constants are unique for all nodes but the states should be repetead for all nodes -> array
            ${specificComputeCore}

            // Get new Vm value, by quatizing
            states[idx].vm += ((d2dxdx_V*lambda) - ((curr_Iion+i_stim)/constants.cm)) * integ.dt;
            states[idx].t += integ.dt;
            
            //Pass to vms and save/debug if necessary
            ${saveBufferAction}
            ${debugBufferAction}
            vms[idx] = states[idx].vm;
            
        }
    `;
}