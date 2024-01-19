import { fentonKarmaDefinitions, fentonKarmaCoreCompute } from '../cellular_shaders/fenton_karma_wgsl.js'
import { gaurDefinitions, gaurCoreCompute} from '../cellular_shaders/gaur_wgsl.js'
import { get2DSecondDerivatives } from './get2DSecondDerivatives.js';

export function computeShaderMonodomainSurf(cellModel, nNodes){

    var specificDefinitions;
    var specificComputeCore;
    var secondDerivativesShader = get2DSecondDerivatives(nNodes);
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

        struct FiberOrientation {
            long_x : f32,
            long_y : f32,
            long_z : f32,
        };

        struct Connections {
            i_j1: u32,
            i1_j1: u32,
            i1_j: u32,
            i1_jminus1: u32,
            i_jminus1: u32,
            iminus1_jminus1: u32,
            iminus1_j: u32,
            iminus1_j1: u32
        };

        ${specificDefinitions}

        @binding(0) @group(0) var<storage, read_write> vois          : array<f32>;
        @binding(1) @group(0) var<storage, read>       stim          : array<Stim, ${nNodes}>;
        @binding(2) @group(0) var<storage, read_write> states        : array<States, ${nNodes}>;
        @binding(3) @group(0) var<storage, read>       fibers_orient : array<FiberOrientation, ${nNodes}>;
        @binding(4) @group(0) var<storage, read>       connections   : array<Connections, ${nNodes}>;
        @binding(5) @group(0) var<uniform>             constants     : Constants;
        @binding(6) @group(0) var<uniform>             integ         : Integration;
        @binding(7) @group(0) var<uniform>             visual_params : VisualParams;
        // @binding(8) @group(0) var<storage, read_write> results : array<f32>;

        var<private> current_compute_interval: f32;

        @compute @workgroup_size(64)
        fn comp_monodomain_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx >= arrayLength(&vois)) | (integ.dt <= 0.)) {return;}

            // But for the last voi in the right tip of the line we compute the Vm
            current_compute_interval = trunc(states[idx].t/visual_params.plot_dt);

            // Get the G tensor
            // This is done out of the loop as the values are always equal in the loop, they only can change from outside
            // by wirting the buffer but in that case this code will be rerun
            var sigma_trans:f32 = constants.sigma_long * constants.sigma_trans_2_long;
            var sigma_xx:f32 = (pow(fibers_orient[idx].long_x,2) * constants.sigma_long) + (pow(fibers_orient[idx].long_y,2) * sigma_trans);
            var sigma_xy:f32 = fibers_orient[idx].long_x * fibers_orient[idx].long_y * (constants.sigma_long - sigma_trans);
            var sigma_yx:f32 = sigma_xy;
            var sigma_yy:f32 = (pow(fibers_orient[idx].long_y,2) * constants.sigma_long) + (pow(fibers_orient[idx].long_x,2) * sigma_trans);

            // Compute the Monodomain equation 
            loop{

                // Monodomain Step 1, diffusion
                // TODO Here the Vms in the neighbouring nodes are freezed to values they had when we entered this thread
                // as all nodes Vms are computed in parallel the value is different now, right?
                // For example if I do array [1,1,0]
                // array[idx] = array[idx-1] + 1
                // array[idx] = array[idx] + 1
                // array[idx] = array[idx-1] + 1
                // The result is not the same if I launch the three pass in a single compute shader than every single
                //  step in a single compute shader, I think! we should try it!

                // TODO also nans are arriving I think it might be for something wron in the derivates and the code
                // also maybe we can try with lower time and dx resolution, see chapra how was the dx/dt has to be.
                // also control the second derivatives code and ask guidelines regarding the theory of the implementation 
                let i_j1            : u32 = connections[idx].i_j1;           
                let i1_j1           : u32 = connections[idx].i1_j1;         
                let i1_j            : u32 = connections[idx].i1_j;         
                let i1_jminus1      : u32 = connections[idx].i1_jminus1;     
                let i_jminus1       : u32 = connections[idx].i_jminus1;      
                let iminus1_jminus1 : u32 = connections[idx].iminus1_jminus1;
                let iminus1_j       : u32 = connections[idx].iminus1_j;      
                let iminus1_j1      : u32 = connections[idx].iminus1_j1; 
                var d2dxdx_V:f32 = 0.0;
                var d2dydy_V:f32 = 0.0;    
                var d2dxdy_V:f32 = 0.0;
                // d2dxdy_V = d2dydx_V

                ${secondDerivativesShader}

                d2dydy_V = 0.0;    
                d2dxdy_V = 0.0;

                var ddx_A:f32 = d2dxdx_V * sigma_xx + d2dxdy_V * sigma_xy; 
                var ddy_B:f32 = d2dxdy_V * sigma_yx + d2dydy_V * sigma_yy;
                var divG_gradV:f32 = ddx_A + ddy_B;

                storageBarrier();

                // 10^5 to scale to have consistent units
                states[idx].vm = states[idx].vm + ((divG_gradV * integ.dt/2 * 100000) / (constants.beta * constants.cm));


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
                
                storageBarrier();

                // Monodomain Step 3, diffusion
                d2dxdx_V = 0.0;
                d2dydy_V = 0.0;    
                d2dxdy_V = 0.0;

                ${secondDerivativesShader}

                d2dydy_V = 0.0;    
                d2dxdy_V = 0.0;

                // results[idx] = d2dxdx_V;

                ddx_A = d2dxdx_V * sigma_xx + d2dxdy_V * sigma_xy; 
                ddy_B = d2dxdy_V * sigma_yx + d2dydy_V * sigma_yy;
                divG_gradV = ddx_A + ddy_B;

                storageBarrier();

                // 10^5 to scale to have consistent units
                states[idx].vm = states[idx].vm + ((divG_gradV * integ.dt/2 * 100000) / (constants.beta * constants.cm));

                
                states[idx].t += integ.dt;


                storageBarrier();

                if ( trunc(states[idx].t/visual_params.plot_dt) != current_compute_interval) {break;}

            }

            //Pass to vois and normalize for plotting    
            // If vm is out of the Voi max min range we would have a magenta color
            vois[idx] = (states[idx].vm - visual_params.voi_min) / (visual_params.voi_max - visual_params.voi_min);                  

            
        }
    `;
}



