import { fentonKarmaDefinitions, fentonKarmaCoreCompute } from '../cellular_shaders/fenton_karma_wgsl.js'
import { gaurDefinitions, gaurCoreCompute} from '../cellular_shaders/gaur_wgsl.js'
import { get2DSecondDerivatives } from './get2DSecondDerivatives.js';

export function computeShaderMonodomainDivG_GradV(cellModel, nNodes){


    var secondDerivativesShader = get2DSecondDerivatives(nNodes);
    var specificDefinitions;
    if (cellModel == 'Fenton_Karma'){
        specificDefinitions = fentonKarmaDefinitions;
    }else if (cellModel == 'Gaur'){
        specificDefinitions = gaurDefinitions;
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }

    return /*wgsl*/`

        struct Integration {
            dt : f32,
            dx : f32
        }

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

        @binding(0) @group(0) var<storage, read_write> states        : array<States, ${nNodes}>;
        @binding(1) @group(0) var<storage, read>       fibers_orient : array<FiberOrientation, ${nNodes}>;
        @binding(2) @group(0) var<storage, read>       connections   : array<Connections, ${nNodes}>;
        @binding(3) @group(0) var<uniform>             constants     : Constants;
        @binding(4) @group(0) var<uniform>             integ         : Integration;
        @binding(5) @group(0) var<storage, read_write> results : array<f32>;


        @compute @workgroup_size(64)
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            // let idx = GlobalInvocationID.x + (GlobalInvocationID.y * 9*8) + (GlobalInvocationID.z * 9*8 * 9*8);
            if((idx >= ${nNodes}) | (integ.dt <= 0.)) {return;}

            // Get the G tensor
            // This is done out of the loop as the values are always equal in the loop, they only can change from outside
            // by wirting the buffer but in that case this code will be rerun
            var sigma_trans:f32 = constants.sigma_long * constants.sigma_trans_2_long;
            var sigma_xx:f32 = (pow(fibers_orient[idx].long_x,2) * constants.sigma_long) + (pow(fibers_orient[idx].long_y,2) * sigma_trans);
            var sigma_xy:f32 = fibers_orient[idx].long_x * fibers_orient[idx].long_y * (constants.sigma_long - sigma_trans);
            var sigma_yx:f32 = sigma_xy;
            var sigma_yy:f32 = (pow(fibers_orient[idx].long_y,2) * constants.sigma_long) + (pow(fibers_orient[idx].long_x,2) * sigma_trans);

            // Get the double single and mixed derivatives stimation
            var i_j1            : u32 = connections[idx].i_j1;           
            var i1_j1           : u32 = connections[idx].i1_j1;         
            var i1_j            : u32 = connections[idx].i1_j;         
            var i1_jminus1      : u32 = connections[idx].i1_jminus1;     
            var i_jminus1       : u32 = connections[idx].i_jminus1;      
            var iminus1_jminus1 : u32 = connections[idx].iminus1_jminus1;
            var iminus1_j       : u32 = connections[idx].iminus1_j;      
            var iminus1_j1      : u32 = connections[idx].iminus1_j1; 
            var d2dxdx_V:f32 = 0.0;
            var d2dydy_V:f32 = 0.0;    
            var d2dxdy_V:f32 = 0.0;
            // d2dxdy_V = d2dydx_V

            ${secondDerivativesShader}

            // Get the final term, the divergence of the gradient of the voltage amplified by the conductivity (divG_gradV)
            var ddx_A:f32 = d2dxdx_V * sigma_xx + d2dxdy_V * sigma_xy; 
            var ddy_B:f32 = d2dxdy_V * sigma_yx + d2dydy_V * sigma_yy;
            states[idx].divG_gradV = ddx_A + ddy_B;

            results[idx] = states[idx].divG_gradV;

            
        }
    `;
}


export function computeShaderMonodomainSurf(cellModel, nNodes){

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

        @binding(0) @group(0) var<storage, read_write> vois          : array<f32>;
        @binding(1) @group(0) var<storage, read_write> states        : array<States, ${nNodes}>;
        @binding(2) @group(0) var<uniform>             constants     : Constants;
        @binding(3) @group(0) var<uniform>             integ         : Integration;
        @binding(4) @group(0) var<uniform>             visual_params : VisualParams;
        @binding(5) @group(0) var<storage, read>       stim          : array<Stim, ${nNodes}>;
        @binding(6) @group(0) var<storage, read_write> results : array<f32>;

        @compute @workgroup_size(64)
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x;
            // let idx = GlobalInvocationID.x + (GlobalInvocationID.y * sizeX * dispatched_x ) + (GlobalInvocationID.z * sizeX*dispatched_x * sizeY*dispatched_y);            
            
            if((idx >= ${nNodes}) | (integ.dt <= 0.)) {return;}
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
            states[idx].vm = states[idx].vm + ((((states[idx].divG_gradV*100000)/(constants.beta*constants.cm)) - ((curr_Iion+i_stim)/constants.cm)) * integ.dt);
            states[idx].t += integ.dt;

            results[idx] = states[idx].vm;
            vois[idx] = (states[idx].vm - visual_params.voi_min) / (visual_params.voi_max - visual_params.voi_min);  


            
        }
    `;
}