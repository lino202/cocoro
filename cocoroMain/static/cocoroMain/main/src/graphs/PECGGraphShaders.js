import { fentonKarmaDefinitions } from '../cellular_shaders/fenton_karma_wgsl'
import { gaurDefinitions} from '../cellular_shaders/gaur_wgsl'


export function computePECGGraphShader1(nNodes, workgroup_size=64){

    return /*wgsl*/`

        struct Coords {
            x : f32,
            y : f32,
            z : f32,
        };

        struct ElectrodesVectorial {
            la : Coords,
            ra : Coords,
            ll : Coords,
            rl : Coords,
            v1 : Coords,
            v2 : Coords,
            v3 : Coords,
            v4 : Coords,
            v5 : Coords,
            v6 : Coords
        };

        @binding(0) @group(0) var<storage, read_write> grad_inv_r_arr : array<ElectrodesVectorial, ${nNodes}>;
        @binding(1) @group(0) var<storage, read>       nodes_positions : array<Coords, ${nNodes}>;
        @binding(2) @group(0) var<storage, read>       electrodes_positions : ElectrodesVectorial;  // This cannot be uniform as uniform adress space requires array elements are aligned to 16 byte boundaries 
        
        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if(idx >= ${nNodes}) {return;}
            
            // get grad 1/r for all leads with respect to node idx, maybe take care of r near zero?
            var r_la:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.la.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.la.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.la.z, 2) );
            grad_inv_r_arr[idx].la.x = - (electrodes_positions.la.x - nodes_positions[idx].x) / pow(r_la, 3);
            grad_inv_r_arr[idx].la.y = - (electrodes_positions.la.y - nodes_positions[idx].y) / pow(r_la, 3);
            grad_inv_r_arr[idx].la.z = - (electrodes_positions.la.z - nodes_positions[idx].z) / pow(r_la, 3);

            var r_ra:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.ra.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.ra.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.ra.z, 2) );
            grad_inv_r_arr[idx].ra.x = - (electrodes_positions.ra.x - nodes_positions[idx].x) / pow(r_ra, 3);
            grad_inv_r_arr[idx].ra.y = - (electrodes_positions.ra.y - nodes_positions[idx].y) / pow(r_ra, 3);
            grad_inv_r_arr[idx].ra.z = - (electrodes_positions.ra.z - nodes_positions[idx].z) / pow(r_ra, 3);

            var r_ll:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.ll.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.ll.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.ll.z, 2) );
            grad_inv_r_arr[idx].ll.x = - (electrodes_positions.ll.x - nodes_positions[idx].x) / pow(r_ll, 3);
            grad_inv_r_arr[idx].ll.y = - (electrodes_positions.ll.y - nodes_positions[idx].y) / pow(r_ll, 3);
            grad_inv_r_arr[idx].ll.z = - (electrodes_positions.ll.z - nodes_positions[idx].z) / pow(r_ll, 3);

            var r_rl:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.rl.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.rl.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.rl.z, 2) );
            grad_inv_r_arr[idx].rl.x = - (electrodes_positions.rl.x - nodes_positions[idx].x) / pow(r_rl, 3);
            grad_inv_r_arr[idx].rl.y = - (electrodes_positions.rl.y - nodes_positions[idx].y) / pow(r_rl, 3);
            grad_inv_r_arr[idx].rl.z = - (electrodes_positions.rl.z - nodes_positions[idx].z) / pow(r_rl, 3);

            var r_v1:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.v1.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.v1.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.v1.z, 2) );
            grad_inv_r_arr[idx].v1.x = - (electrodes_positions.v1.x - nodes_positions[idx].x) / pow(r_v1, 3);
            grad_inv_r_arr[idx].v1.y = - (electrodes_positions.v1.y - nodes_positions[idx].y) / pow(r_v1, 3);
            grad_inv_r_arr[idx].v1.z = - (electrodes_positions.v1.z - nodes_positions[idx].z) / pow(r_v1, 3);

            var r_v2:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.v2.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.v2.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.v2.z, 2) );
            grad_inv_r_arr[idx].v2.x = - (electrodes_positions.v2.x - nodes_positions[idx].x) / pow(r_v2, 3);
            grad_inv_r_arr[idx].v2.y = - (electrodes_positions.v2.y - nodes_positions[idx].y) / pow(r_v2, 3);
            grad_inv_r_arr[idx].v2.z = - (electrodes_positions.v2.z - nodes_positions[idx].z) / pow(r_v2, 3);

            var r_v3:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.v3.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.v3.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.v3.z, 2) );
            grad_inv_r_arr[idx].v3.x = - (electrodes_positions.v3.x - nodes_positions[idx].x) / pow(r_v3, 3);
            grad_inv_r_arr[idx].v3.y = - (electrodes_positions.v3.y - nodes_positions[idx].y) / pow(r_v3, 3);
            grad_inv_r_arr[idx].v3.z = - (electrodes_positions.v3.z - nodes_positions[idx].z) / pow(r_v3, 3);

            var r_v4:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.v4.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.v4.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.v4.z, 2) );
            grad_inv_r_arr[idx].v4.x = - (electrodes_positions.v4.x - nodes_positions[idx].x) / pow(r_v4, 3);
            grad_inv_r_arr[idx].v4.y = - (electrodes_positions.v4.y - nodes_positions[idx].y) / pow(r_v4, 3);
            grad_inv_r_arr[idx].v4.z = - (electrodes_positions.v4.z - nodes_positions[idx].z) / pow(r_v4, 3);

            var r_v5:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.v5.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.v5.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.v5.z, 2) );
            grad_inv_r_arr[idx].v5.x = - (electrodes_positions.v5.x - nodes_positions[idx].x) / pow(r_v5, 3);
            grad_inv_r_arr[idx].v5.y = - (electrodes_positions.v5.y - nodes_positions[idx].y) / pow(r_v5, 3);
            grad_inv_r_arr[idx].v5.z = - (electrodes_positions.v5.z - nodes_positions[idx].z) / pow(r_v5, 3);

            var r_v6:f32 = sqrt( pow(nodes_positions[idx].x - electrodes_positions.v6.x, 2) + 
                                pow(nodes_positions[idx].y - electrodes_positions.v6.y, 2) + 
                                pow(nodes_positions[idx].z - electrodes_positions.v6.z, 2) );
            grad_inv_r_arr[idx].v6.x = - (electrodes_positions.v6.x - nodes_positions[idx].x) / pow(r_v6, 3);
            grad_inv_r_arr[idx].v6.y = - (electrodes_positions.v6.y - nodes_positions[idx].y) / pow(r_v6, 3);
            grad_inv_r_arr[idx].v6.z = - (electrodes_positions.v6.z - nodes_positions[idx].z) / pow(r_v6, 3);
        }
        
    `;
        
}

function computeGradLine(specificDefinitions, nNodes, workgroup_size){

    return /*wgsl*/`
        
        ${specificDefinitions}

        struct Coords {
            x : f32,
            y : f32,
            z : f32,
        };

        struct ElectrodesVectorial {
            la : Coords,
            ra : Coords,
            ll : Coords,
            rl : Coords,
            v1 : Coords,
            v2 : Coords,
            v3 : Coords,
            v4 : Coords,
            v5 : Coords,
            v6 : Coords
        };

        struct ElectrodesScalar {
            la : f32,
            ra : f32,
            ll : f32,
            rl : f32,
            v1 : f32,
            v2 : f32,
            v3 : f32,
            v4 : f32,
            v5 : f32,
            v6 : f32
        };

        @binding(0) @group(0) var<storage, read_write> extracellular_potential : ElectrodesScalar;
        @binding(1) @group(0) var<storage, read>       states : array<States, ${nNodes}>;
        @binding(2) @group(0) var<storage, read>       grad_inv_r_arr : array<ElectrodesVectorial, ${nNodes}>;
        @binding(3) @group(0) var<uniform>             dx : f32;
        
        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if(idx >= ${nNodes}) {return;}

            // Compute the gradV . grad(r) where is the magnitude of the node position with respect to one electrode
            // this is computed for the node idx with respect to all 10 electrodes
            var ddx_V:f32 = 0.0;

            // The gradient is null in the extremes of the line due to the Newmann condition, 
            // so we only change the default 0 value when we are in the middle nodes of the line
            if ((idx<${nNodes}-1) && (idx>0)) {
                ddx_V = (states[idx+1].vm - states[idx-1].vm) / (2*dx);
            }
            
            // sum to the same location for accumalation (integral), in line we only need dx 
            // TODO ATTENTION check if the minus sign is correct, moreover the conductivities and other constants outside the 
            // integral scale the results for having the right mV units of the ECG but here that is not neccesary as we scalate the 
            // the extracellular potential for plotting, so trends are ok but remember! magnitudes are not in mV
            extracellular_potential.la += ddx_V * grad_inv_r_arr[idx].la.x * 1e8;
            extracellular_potential.ra += ddx_V * grad_inv_r_arr[idx].ra.x * 1e8;
            extracellular_potential.ll += ddx_V * grad_inv_r_arr[idx].ll.x * 1e8;
            extracellular_potential.rl += ddx_V * grad_inv_r_arr[idx].rl.x * 1e8;
            extracellular_potential.v1 += ddx_V * grad_inv_r_arr[idx].v1.x * 1e8;
            extracellular_potential.v2 += ddx_V * grad_inv_r_arr[idx].v2.x * 1e8;
            extracellular_potential.v3 += ddx_V * grad_inv_r_arr[idx].v3.x * 1e8;
            extracellular_potential.v4 += ddx_V * grad_inv_r_arr[idx].v4.x * 1e8;
            extracellular_potential.v5 += ddx_V * grad_inv_r_arr[idx].v5.x * 1e8;
            extracellular_potential.v6 += ddx_V * grad_inv_r_arr[idx].v6.x * 1e8;
        }
        
    `;


}

export function computePECGGraphShader2(cellModel, nNodes, elemType, workgroup_size=64){

    var specificDefinitions;
    if (cellModel == 'Fenton_Karma'){
        specificDefinitions = fentonKarmaDefinitions;
    }else if (cellModel == 'Gaur'){
        specificDefinitions = gaurDefinitions;
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }


    if (elemType=='line'){
        return computeGradLine(specificDefinitions, nNodes, workgroup_size)
    }else if (elemType=='quad'){
        throw new Error(`Unknown Elem Type "${elemType}"`)
        // return computeGradQuad(specificDefinitions, nNodes, workgroup_size)
    }else if (elemType=='hexa'){
        throw new Error(`Unknown Elem Type "${elemType}"`)
        // return computeGradHexa(specificDefinitions, nNodes, workgroup_size)
    }else{
        throw new Error(`Unknown Elem Type "${elemType}"`)
    }
        
}

export function computePECGGraphShader3(numPoints, numECGLeads, workgroup_size=64){

    return /*wgsl*/`

        struct ElectrodesScalar {
            la : f32,
            ra : f32,
            ll : f32,
            rl : f32,
            v1 : f32,
            v2 : f32,
            v3 : f32,
            v4 : f32,
            v5 : f32,
            v6 : f32
        };

        struct VisualParams {
            min : f32,
            max : f32       
        };

        @binding(0) @group(0) var<storage, read>       extracellular_potential : ElectrodesScalar;
        @binding(1) @group(0) var<storage, read_write> vois : array<f32>; //This vois is an array with all the values shown in the pECG graph so it has 12*numPoints (graph points) values
        @binding(2) @group(0) var<storage, read>       visualization : VisualParams;
        @binding(3) @group(0) var<storage, read>       vois_copy : array<f32>;
        
        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx >= arrayLength(&vois))) {return;}

            // Vois not in the right tip of the line should just switch the value
            if ( (idx!=(1*${numPoints}-1)) && (idx!=(2*${numPoints}-1)) && (idx!=(3*${numPoints}-1)) && (idx!=(4*${numPoints}-1)) && (idx!=(5*${numPoints}-1)) && (idx!=(6*${numPoints}-1))
             && (idx!=(7*${numPoints}-1)) && (idx!=(8*${numPoints}-1)) && (idx!=(9*${numPoints}-1)) && (idx!=(10*${numPoints}-1)) && (idx!=(11*${numPoints}-1)) && (idx!=(12*${numPoints}-1)) ) {
                
                vois[idx] = vois_copy[idx+1];
                return;    
            }

            var max_value_to_plot:f32 = 1.0;
            // Lead I 
            if (idx==(1*${numPoints}-1)){
                vois[idx] = extracellular_potential.la - extracellular_potential.ra;
            }
            // Lead II 
            if (idx==(2*${numPoints}-1)){
                vois[idx] = extracellular_potential.ll - extracellular_potential.ra;
            }
            // Lead III
            if (idx==(3*${numPoints}-1)){
                vois[idx] = extracellular_potential.ll - extracellular_potential.la;
            }
            // Lead aVR
            if (idx==(4*${numPoints}-1)){
                vois[idx] = extracellular_potential.ra - (extracellular_potential.ll + extracellular_potential.la) / 2;
            }
            // Lead aVL
            if (idx==(5*${numPoints}-1)){
                vois[idx] = extracellular_potential.la - (extracellular_potential.ra + extracellular_potential.ll) / 2;
            }
            // Lead aVF 
            if (idx==(6*${numPoints}-1)){
                vois[idx] = extracellular_potential.ll - (extracellular_potential.ra + extracellular_potential.la) / 2;
            }
            // Lead V1 
            if (idx==(7*${numPoints}-1)){
                vois[idx] = extracellular_potential.v1 - (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3;
                max_value_to_plot = 0.0;
            }
            // Lead V2 
            if (idx==(8*${numPoints}-1)){
                vois[idx] = extracellular_potential.v2 - (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3;
                max_value_to_plot = 0.0;
            }
            // Lead V3
            if (idx==(9*${numPoints}-1)){
                vois[idx] = extracellular_potential.v3 - (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3;
                max_value_to_plot = 0.0;
            }
            // Lead V4
            if (idx==(10*${numPoints}-1)){
                vois[idx] = extracellular_potential.v4 - (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3;
                max_value_to_plot = 0.0;
            }
            // Lead V5
            if (idx==(11*${numPoints}-1)){
                vois[idx] = extracellular_potential.v5 - (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3; 
                max_value_to_plot = 0.0;
            }
            // Lead V6
            if (idx==(12*${numPoints}-1)){
                vois[idx] = extracellular_potential.v6 - (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3;
                max_value_to_plot = 0.0;
            }

            // Pass to vois and normalize to plot
            if (vois[idx] < 3.40282346638528859812e+38f){ //Check for overflow, nan or inf positive oder negative
                //range needs to be [-0.5,0.5] as after the vertex_shader sums +/-0.5
                vois[idx] = ((vois[idx] - visualization.min) / (visualization.max - visualization.min)) - 0.5; 
                if (vois[idx] > max_value_to_plot){
                    vois[idx] = max_value_to_plot;
                }
            }else{
                vois[idx] = -0.5; //Plot a line in the bottom if this overflows
            }

            
        }
        
    `;
}

export const renderPECGGraphVertexShader = /*wgsl*/`
    struct Output {
        @builtin(position) Position : vec4<f32>
    };

    @vertex
    fn vs_main (@location(0) coordinates: vec2<f32>, @location(1) voi: f32) -> Output {    
        var output: Output;            
        output.Position = vec4<f32>(coordinates[0], coordinates[1] + voi, 0.0, 1.0);
        return output;
    }
`;


export const renderPECGGraphFragmentShader = /*wgsl*/`
    @fragment
    fn fs_main ()  ->  @location(0) vec4<f32> {
        return vec4(1.0, 0.0, 0.0, 1.0); // plot in red
    }
`;