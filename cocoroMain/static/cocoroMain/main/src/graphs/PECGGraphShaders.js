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

function computeGradLine(specificDefinitions, nNodes, nWorkgroups, workgroup_size){

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

        @binding(0) @group(0) var<storage, read_write> extracellular_potential_per_workgroup : array<ElectrodesScalar, ${nWorkgroups}>;  //This depends on the number of nodes, it can be just 1
        @binding(1) @group(0) var<storage, read>       states : array<States, ${nNodes}>;
        @binding(2) @group(0) var<storage, read>       grad_inv_r_arr : array<ElectrodesVectorial, ${nNodes}>;
        @binding(3) @group(0) var<uniform>             dx : f32;
        
        var<workgroup> workgroup_data: array<ElectrodesScalar, ${workgroup_size}>;
        const amplification:f32 = 1e8;

        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>, 
                     @builtin(local_invocation_id) LocalInvocationId: vec3<u32>,
                     @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
            
            // The idx can be over nNodes -> these do not sum anything :D so it is ok!
            // this maintains the 'uniform control flow' allowing the barrier to work
            let idx = GlobalInvocationID.x;

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

            // We populate the workgroup variable with shared memory/data to synchronously sum
            workgroup_data[LocalInvocationId.x].la = ddx_V * grad_inv_r_arr[idx].la.x * amplification;
            workgroup_data[LocalInvocationId.x].ra = ddx_V * grad_inv_r_arr[idx].ra.x * amplification;
            workgroup_data[LocalInvocationId.x].ll = ddx_V * grad_inv_r_arr[idx].ll.x * amplification;
            workgroup_data[LocalInvocationId.x].rl = ddx_V * grad_inv_r_arr[idx].rl.x * amplification;
            workgroup_data[LocalInvocationId.x].v1 = ddx_V * grad_inv_r_arr[idx].v1.x * amplification;
            workgroup_data[LocalInvocationId.x].v2 = ddx_V * grad_inv_r_arr[idx].v2.x * amplification;
            workgroup_data[LocalInvocationId.x].v3 = ddx_V * grad_inv_r_arr[idx].v3.x * amplification;
            workgroup_data[LocalInvocationId.x].v4 = ddx_V * grad_inv_r_arr[idx].v4.x * amplification;
            workgroup_data[LocalInvocationId.x].v5 = ddx_V * grad_inv_r_arr[idx].v5.x * amplification;
            workgroup_data[LocalInvocationId.x].v6 = ddx_V * grad_inv_r_arr[idx].v6.x * amplification;

            // Wait to for all invocations in the same workgroup to have the values computed and loaded
            workgroupBarrier();

            // We synchronously sum all values in the same workgroup, by using several invocations inside the workgroup
            // it maybe easy to make one invocation to sum all values but the for loop will have more loops so this is faster
            for (var current_size:u32 = ${workgroup_size} / 2; current_size > 0; current_size /= 2) {
                var sum_la:f32 = 0.0;
                var sum_ra:f32 = 0.0;
                var sum_ll:f32 = 0.0;
                var sum_rl:f32 = 0.0;
                var sum_v1:f32 = 0.0;
                var sum_v2:f32 = 0.0;
                var sum_v3:f32 = 0.0;
                var sum_v4:f32 = 0.0;
                var sum_v5:f32 = 0.0;
                var sum_v6:f32 = 0.0;

                if (LocalInvocationId.x < current_size) {
                    sum_la = workgroup_data[LocalInvocationId.x].la + workgroup_data[LocalInvocationId.x + current_size].la;
                    sum_ra = workgroup_data[LocalInvocationId.x].ra + workgroup_data[LocalInvocationId.x + current_size].ra;
                    sum_ll = workgroup_data[LocalInvocationId.x].ll + workgroup_data[LocalInvocationId.x + current_size].ll;
                    sum_rl = workgroup_data[LocalInvocationId.x].rl + workgroup_data[LocalInvocationId.x + current_size].rl;
                    sum_v1 = workgroup_data[LocalInvocationId.x].v1 + workgroup_data[LocalInvocationId.x + current_size].v1;
                    sum_v2 = workgroup_data[LocalInvocationId.x].v2 + workgroup_data[LocalInvocationId.x + current_size].v2;
                    sum_v3 = workgroup_data[LocalInvocationId.x].v3 + workgroup_data[LocalInvocationId.x + current_size].v3;
                    sum_v4 = workgroup_data[LocalInvocationId.x].v4 + workgroup_data[LocalInvocationId.x + current_size].v4;
                    sum_v5 = workgroup_data[LocalInvocationId.x].v5 + workgroup_data[LocalInvocationId.x + current_size].v5;
                    sum_v6 = workgroup_data[LocalInvocationId.x].v6 + workgroup_data[LocalInvocationId.x + current_size].v6;
                }
                // Wait until all invocations have finished reading from workgroup_data, and have calculated their respective sums
                workgroupBarrier();

                if (LocalInvocationId.x < current_size) {
                    workgroup_data[LocalInvocationId.x].la = sum_la;
                    workgroup_data[LocalInvocationId.x].ra = sum_ra;
                    workgroup_data[LocalInvocationId.x].ll = sum_ll;
                    workgroup_data[LocalInvocationId.x].rl = sum_rl;
                    workgroup_data[LocalInvocationId.x].v1 = sum_v1;
                    workgroup_data[LocalInvocationId.x].v2 = sum_v2;
                    workgroup_data[LocalInvocationId.x].v3 = sum_v3;
                    workgroup_data[LocalInvocationId.x].v4 = sum_v4;
                    workgroup_data[LocalInvocationId.x].v5 = sum_v5;
                    workgroup_data[LocalInvocationId.x].v6 = sum_v6;
                }
                // Wait for each invocation to finish one iteration of the loop, and to have finished writing to workgroup_data
                workgroupBarrier();
            }
            
            // Write the sum to the output
            if (LocalInvocationId.x == 0) {
                extracellular_potential_per_workgroup[WorkgroupID.x].la = workgroup_data[0].la;
                extracellular_potential_per_workgroup[WorkgroupID.x].ra = workgroup_data[0].ra;
                extracellular_potential_per_workgroup[WorkgroupID.x].ll = workgroup_data[0].ll;
                extracellular_potential_per_workgroup[WorkgroupID.x].rl = workgroup_data[0].rl;
                extracellular_potential_per_workgroup[WorkgroupID.x].v1 = workgroup_data[0].v1;
                extracellular_potential_per_workgroup[WorkgroupID.x].v2 = workgroup_data[0].v2;
                extracellular_potential_per_workgroup[WorkgroupID.x].v3 = workgroup_data[0].v3;
                extracellular_potential_per_workgroup[WorkgroupID.x].v4 = workgroup_data[0].v4;
                extracellular_potential_per_workgroup[WorkgroupID.x].v5 = workgroup_data[0].v5;
                extracellular_potential_per_workgroup[WorkgroupID.x].v6 = workgroup_data[0].v6;
            }


        }
        
    `;
}


function computeGradQuad(specificDefinitions, nNodes, nWorkgroups, workgroup_size){

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

        struct Connections {
            _i_j1  :  u32,
            _i1_j1 :  u32,
            _i1_j  :  u32,
            _i1_1j :  u32,
            _i_1j  :  u32,
            _1i_1j :  u32,
            _1i_j  :  u32,
            _1i_j1 :  u32
        };

        @binding(0) @group(0) var<storage, read_write> extracellular_potential_per_workgroup : array<ElectrodesScalar, ${nWorkgroups}>;
        @binding(1) @group(0) var<storage, read>       states         : array<States, ${nNodes}>;
        @binding(2) @group(0) var<storage, read>       grad_inv_r_arr : array<ElectrodesVectorial, ${nNodes}>;
        @binding(3) @group(0) var<uniform>             dx             : f32;
        @binding(4) @group(0) var<storage, read>       connections    : array<Connections, ${nNodes}>;
        
        var<workgroup> workgroup_data: array<ElectrodesScalar, ${workgroup_size}>;
        const amplification:f32 = 1e8;

        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>, 
                     @builtin(local_invocation_id) LocalInvocationId: vec3<u32>,
                     @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
            
            // The idx can be over nNodes -> these do not sum anything :D so it is ok!
            // this maintains the 'uniform control flow' allowing the barrier to work
            let idx = GlobalInvocationID.x;

            // Compute the gradV . grad(r) where is the magnitude of the node position with respect to one electrode
            // this is computed for the node idx with respect to all 10 electrodes
            let _i_j1  : u32 = connections[idx]._i_j1;           
            let _i1_j1 : u32 = connections[idx]._i1_j1;         
            let _i1_j  : u32 = connections[idx]._i1_j;         
            let _i1_1j : u32 = connections[idx]._i1_1j;     
            let _i_1j  : u32 = connections[idx]._i_1j;      
            let _1i_1j : u32 = connections[idx]._1i_1j;
            let _1i_j  : u32 = connections[idx]._1i_j;      
            let _1i_j1 : u32 = connections[idx]._1i_j1; 
            var ddx_V:f32 = 0.0;
            var ddy_V:f32 = 0.0;

            // ATTENTION The gradient is null in the normal direction of the boundary due to the Newmann condition, 
            // this is a little trickier than the line, if we are on the top the ddy_V is null but no ddx_V

            // after analysis we see we have 12 boundary cases, 4 lateral bands (lacking three neihgbouring nodes out of 8),
            // and 8 corners, 4 inner and 4 outer corners.
            // After analysing the boundaries we see that if we have both values for computing ddx or ddy they should be computed
            // so if the neighbouring nodes exist ddx and/or ddy should be computed (might be zero or different to zero)
            if ((_i1_j < ${nNodes}) & (_1i_j < ${nNodes})){
                ddx_V = (states[_i1_j].vm - states[_1i_j].vm) / (2*dx);
            }

            if ((_i_j1 < ${nNodes}) & (_i_1j < ${nNodes})){
                ddy_V = (states[_i_j1].vm - states[_i_1j].vm) / (2*dx);
            }

            // But the above condition do not take into account the 4 inner corners (the ddx and ddy are computed), so
            // we need to take care of those manually, this do not work on holes made up of 1 quad elem ATTENTION
            // TODO check if this should be zero as I believe it must be
            // I comment this part as I assume as correct to compute the gradients if the ghost nodes exists 
            // if (((_i1_j1 == {nNodes}) & (_i1_1j < {nNodes}) & (_1i_1j < {nNodes}) & (_1i_j1 < {nNodes})) |
            //     ((_i1_j1 < {nNodes}) & (_i1_1j == {nNodes}) & (_1i_1j < {nNodes}) & (_1i_j1 < {nNodes})) |
            //     ((_i1_j1 < {nNodes}) & (_i1_1j < {nNodes}) & (_1i_1j == {nNodes}) & (_1i_j1 < {nNodes})) |
            //     ((_i1_j1 < {nNodes}) & (_i1_1j < {nNodes}) & (_1i_1j < {nNodes}) & (_1i_j1 == {nNodes}))){
            //     ddx_V = 0.0;
            //     ddy_V = 0.0;
            // }
            
            // sum to the same location for accumalation (integral), in line we only need dx 
            // TODO ATTENTION check if the minus sign is correct, moreover the conductivities and other constants outside the 
            // integral scale the results for having the right mV units of the ECG but here that is not neccesary as we scalate the 
            // the extracellular potential for plotting, so trends are ok but remember! magnitudes are not in mV
            
            // We populate the workgroup variable with shared memory/data to synchronously sum
            workgroup_data[LocalInvocationId.x].la = (ddx_V * grad_inv_r_arr[idx].la.x + ddy_V * grad_inv_r_arr[idx].la.y) * amplification;
            workgroup_data[LocalInvocationId.x].ra = (ddx_V * grad_inv_r_arr[idx].ra.x + ddy_V * grad_inv_r_arr[idx].ra.y) * amplification;
            workgroup_data[LocalInvocationId.x].ll = (ddx_V * grad_inv_r_arr[idx].ll.x + ddy_V * grad_inv_r_arr[idx].ll.y) * amplification;
            workgroup_data[LocalInvocationId.x].rl = (ddx_V * grad_inv_r_arr[idx].rl.x + ddy_V * grad_inv_r_arr[idx].rl.y) * amplification;
            workgroup_data[LocalInvocationId.x].v1 = (ddx_V * grad_inv_r_arr[idx].v1.x + ddy_V * grad_inv_r_arr[idx].v1.y) * amplification;
            workgroup_data[LocalInvocationId.x].v2 = (ddx_V * grad_inv_r_arr[idx].v2.x + ddy_V * grad_inv_r_arr[idx].v2.y) * amplification;
            workgroup_data[LocalInvocationId.x].v3 = (ddx_V * grad_inv_r_arr[idx].v3.x + ddy_V * grad_inv_r_arr[idx].v3.y) * amplification;
            workgroup_data[LocalInvocationId.x].v4 = (ddx_V * grad_inv_r_arr[idx].v4.x + ddy_V * grad_inv_r_arr[idx].v4.y) * amplification;
            workgroup_data[LocalInvocationId.x].v5 = (ddx_V * grad_inv_r_arr[idx].v5.x + ddy_V * grad_inv_r_arr[idx].v5.y) * amplification;
            workgroup_data[LocalInvocationId.x].v6 = (ddx_V * grad_inv_r_arr[idx].v6.x + ddy_V * grad_inv_r_arr[idx].v6.y) * amplification;

            // Wait to for all invocations in the same workgroup to have the values computed and loaded
            workgroupBarrier();

            // We synchronously sum all values in the same workgroup, by using several invocations inside the workgroup
            // it maybe easy to make one invocation to sum all values but the for loop will have more loops so this is faster
            for (var current_size:u32 = ${workgroup_size} / 2; current_size > 0; current_size /= 2) {
                var sum_la:f32 = 0.0;
                var sum_ra:f32 = 0.0;
                var sum_ll:f32 = 0.0;
                var sum_rl:f32 = 0.0;
                var sum_v1:f32 = 0.0;
                var sum_v2:f32 = 0.0;
                var sum_v3:f32 = 0.0;
                var sum_v4:f32 = 0.0;
                var sum_v5:f32 = 0.0;
                var sum_v6:f32 = 0.0;

                if (LocalInvocationId.x < current_size) {
                    sum_la = workgroup_data[LocalInvocationId.x].la + workgroup_data[LocalInvocationId.x + current_size].la;
                    sum_ra = workgroup_data[LocalInvocationId.x].ra + workgroup_data[LocalInvocationId.x + current_size].ra;
                    sum_ll = workgroup_data[LocalInvocationId.x].ll + workgroup_data[LocalInvocationId.x + current_size].ll;
                    sum_rl = workgroup_data[LocalInvocationId.x].rl + workgroup_data[LocalInvocationId.x + current_size].rl;
                    sum_v1 = workgroup_data[LocalInvocationId.x].v1 + workgroup_data[LocalInvocationId.x + current_size].v1;
                    sum_v2 = workgroup_data[LocalInvocationId.x].v2 + workgroup_data[LocalInvocationId.x + current_size].v2;
                    sum_v3 = workgroup_data[LocalInvocationId.x].v3 + workgroup_data[LocalInvocationId.x + current_size].v3;
                    sum_v4 = workgroup_data[LocalInvocationId.x].v4 + workgroup_data[LocalInvocationId.x + current_size].v4;
                    sum_v5 = workgroup_data[LocalInvocationId.x].v5 + workgroup_data[LocalInvocationId.x + current_size].v5;
                    sum_v6 = workgroup_data[LocalInvocationId.x].v6 + workgroup_data[LocalInvocationId.x + current_size].v6;
                }
                // Wait until all invocations have finished reading from workgroup_data, and have calculated their respective sums
                workgroupBarrier();

                if (LocalInvocationId.x < current_size) {
                    workgroup_data[LocalInvocationId.x].la = sum_la;
                    workgroup_data[LocalInvocationId.x].ra = sum_ra;
                    workgroup_data[LocalInvocationId.x].ll = sum_ll;
                    workgroup_data[LocalInvocationId.x].rl = sum_rl;
                    workgroup_data[LocalInvocationId.x].v1 = sum_v1;
                    workgroup_data[LocalInvocationId.x].v2 = sum_v2;
                    workgroup_data[LocalInvocationId.x].v3 = sum_v3;
                    workgroup_data[LocalInvocationId.x].v4 = sum_v4;
                    workgroup_data[LocalInvocationId.x].v5 = sum_v5;
                    workgroup_data[LocalInvocationId.x].v6 = sum_v6;
                }
                // Wait for each invocation to finish one iteration of the loop, and to have finished writing to workgroup_data
                workgroupBarrier();
            }
            
            // Write the sum to the output
            if (LocalInvocationId.x == 0) {
                extracellular_potential_per_workgroup[WorkgroupID.x].la = workgroup_data[0].la;
                extracellular_potential_per_workgroup[WorkgroupID.x].ra = workgroup_data[0].ra;
                extracellular_potential_per_workgroup[WorkgroupID.x].ll = workgroup_data[0].ll;
                extracellular_potential_per_workgroup[WorkgroupID.x].rl = workgroup_data[0].rl;
                extracellular_potential_per_workgroup[WorkgroupID.x].v1 = workgroup_data[0].v1;
                extracellular_potential_per_workgroup[WorkgroupID.x].v2 = workgroup_data[0].v2;
                extracellular_potential_per_workgroup[WorkgroupID.x].v3 = workgroup_data[0].v3;
                extracellular_potential_per_workgroup[WorkgroupID.x].v4 = workgroup_data[0].v4;
                extracellular_potential_per_workgroup[WorkgroupID.x].v5 = workgroup_data[0].v5;
                extracellular_potential_per_workgroup[WorkgroupID.x].v6 = workgroup_data[0].v6;
            }
        }
        
    `;
}

function computeGradHexa(specificDefinitions, nNodes, nWorkgroups, workgroup_size){

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

        struct Connections {
            _i_j1_k   :  u32, 
            _i1_j1_k  :  u32,
            _i1_j_k   :  u32,
            _i1_1j_k  :  u32,
            _i_1j_k   :  u32,
            _1i_1j_k  :  u32,
            _1i_j_k   :  u32,
            _1i_j1_k  :  u32,
            _i_j_k1   :  u32,
            _i_j1_k1  :  u32,
            _i1_j1_k1 :  u32,
            _i1_j_k1  :  u32,
            _i1_1j_k1 :  u32,
            _i_1j_k1  :  u32,
            _1i_1j_k1 :  u32,
            _1i_j_k1  :  u32,
            _1i_j1_k1 :  u32,
            _i_j_1k   :  u32,
            _i_j1_1k  :  u32,
            _i1_j1_1k :  u32,
            _i1_j_1k  :  u32,
            _i1_1j_1k :  u32,
            _i_1j_1k  :  u32,
            _1i_1j_1k :  u32,
            _1i_j_1k  :  u32,
            _1i_j1_1k :  u32
        };

        @binding(0) @group(0) var<storage, read_write> extracellular_potential_per_workgroup : array<ElectrodesScalar, ${nWorkgroups}>;
        @binding(1) @group(0) var<storage, read>       states         : array<States, ${nNodes}>;
        @binding(2) @group(0) var<storage, read>       grad_inv_r_arr : array<ElectrodesVectorial, ${nNodes}>;
        @binding(3) @group(0) var<uniform>             dx             : f32;
        @binding(4) @group(0) var<storage, read>       connections    : array<Connections, ${nNodes}>;
        
        var<workgroup> workgroup_data: array<ElectrodesScalar, ${workgroup_size}>;
        const amplification:f32 = 1e8;

        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>, 
                     @builtin(local_invocation_id) LocalInvocationId: vec3<u32>,
                     @builtin(workgroup_id) WorkgroupID: vec3<u32>) {
            
            // The idx can be over nNodes -> these do not sum anything :D so it is ok!
            // this maintains the 'uniform control flow' allowing the barrier to work
            let idx = GlobalInvocationID.x;

            // Compute the gradV . grad(r) where is the magnitude of the node position with respect to one electrode
            // this is computed for the node idx with respect to all 10 electrodes
            let _i_j1_k    : u32 = connections[idx]._i_j1_k  ; 
            let _i1_j1_k   : u32 = connections[idx]._i1_j1_k ; 
            let _i1_j_k    : u32 = connections[idx]._i1_j_k  ; 
            let _i1_1j_k   : u32 = connections[idx]._i1_1j_k ; 
            let _i_1j_k    : u32 = connections[idx]._i_1j_k  ; 
            let _1i_1j_k   : u32 = connections[idx]._1i_1j_k ; 
            let _1i_j_k    : u32 = connections[idx]._1i_j_k  ; 
            let _1i_j1_k   : u32 = connections[idx]._1i_j1_k ; 
            let _i_j_k1    : u32 = connections[idx]._i_j_k1  ; 
            let _i_j1_k1   : u32 = connections[idx]._i_j1_k1 ; 
            let _i1_j1_k1  : u32 = connections[idx]._i1_j1_k1; 
            let _i1_j_k1   : u32 = connections[idx]._i1_j_k1 ; 
            let _i1_1j_k1  : u32 = connections[idx]._i1_1j_k1; 
            let _i_1j_k1   : u32 = connections[idx]._i_1j_k1 ; 
            let _1i_1j_k1  : u32 = connections[idx]._1i_1j_k1; 
            let _1i_j_k1   : u32 = connections[idx]._1i_j_k1 ; 
            let _1i_j1_k1  : u32 = connections[idx]._1i_j1_k1; 
            let _i_j_1k    : u32 = connections[idx]._i_j_1k  ; 
            let _i_j1_1k   : u32 = connections[idx]._i_j1_1k ; 
            let _i1_j1_1k  : u32 = connections[idx]._i1_j1_1k; 
            let _i1_j_1k   : u32 = connections[idx]._i1_j_1k ; 
            let _i1_1j_1k  : u32 = connections[idx]._i1_1j_1k; 
            let _i_1j_1k   : u32 = connections[idx]._i_1j_1k ; 
            let _1i_1j_1k  : u32 = connections[idx]._1i_1j_1k; 
            let _1i_j_1k   : u32 = connections[idx]._1i_j_1k ; 
            let _1i_j1_1k  : u32 = connections[idx]._1i_j1_1k; 
            var ddx_V:f32 = 0.0;
            var ddy_V:f32 = 0.0;
            var ddz_V:f32 = 0.0;

            // ATTENTION The gradient is null in the normal direction of the boundary due to the Newmann condition, 
            // this is a little trickier than the line and quad

            // after analysis we can see in the donut in 3D or donut cube that we have as boundaries:
            // - 8 inner corners
            // - 8 outer corners
            // - 12 inner lines
            // - 12 outer lines
            // - 6 inner faces
            // - 6 outer faces
            // If we compute the derivative when the values are available this is right for the nodes in the inner domain
            // and all outer boundaries and inner faces
            if ((_i1_j_k < ${nNodes}) & (_1i_j_k < ${nNodes})){
                ddx_V = (states[_i1_j_k].vm - states[_1i_j_k].vm) / (2*dx);
            }

            if ((_i_j1_k < ${nNodes}) & (_i_1j_k < ${nNodes})){
                ddy_V = (states[_i_j1_k].vm - states[_i_1j_k].vm) / (2*dx);
            }

            if ((_i_j_k1 < ${nNodes}) & (_i_j_1k < ${nNodes})){
                ddz_V = (states[_i_j_k1].vm - states[_i_j_1k].vm) / (2*dx);
            }

            // But the above condition is not valid for nodes in the inner lines and inner corners that will have derivatives computed
            // we need to take care of those manually, this do not work on holes made up of 1 hexa elem ATTENTION
            // TODO check if this should be zero as I believe it must be
            
            // For the inner cornes
            // if (((_i1_j1_k1 == {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 == {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 == {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 == {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k == {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k == {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k == {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k == {nNodes}))){
            //     ddx_V = 0.0;
            //     ddy_V = 0.0;
            //     ddz_V = 0.0;
            // }

            // // For the inner lines, if we lack two corners out of 8 we are in a inner line
            // if (((_i1_j1_k1 == {nNodes}) & (_1i_j1_k1 == {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 == {nNodes}) & (_1i_1j_k1 == {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k == {nNodes}) & (_1i_j1_1k == {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k == {nNodes}) & (_1i_1j_1k == {nNodes}))){
            //     // ddx remain computed and the others are zeroed
            //     ddy_V = 0.0;
            //     ddz_V = 0.0;
            // }

            // if (((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 == {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 == {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 == {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 == {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k == {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k == {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k == {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k == {nNodes}) & (_1i_1j_1k < {nNodes}))){
            //     // ddy remain computed and the others are zeroed
            //     ddx_V = 0.0;
            //     ddz_V = 0.0;
            // }

            // if (((_i1_j1_k1 == {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k == {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 == {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k == {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 == {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 < {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k == {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k < {nNodes})) |
            //     ((_i1_j1_k1 < {nNodes}) & (_1i_j1_k1 < {nNodes}) & (_i1_1j_k1 < {nNodes}) & (_1i_1j_k1 == {nNodes}) & (_i1_j1_1k < {nNodes}) & (_1i_j1_1k < {nNodes}) & (_i1_1j_1k < {nNodes}) & (_1i_1j_1k == {nNodes}))){
            //     // ddz remain computed and the others are zeroed
            //     ddx_V = 0.0;
            //     ddy_V = 0.0;
            // }

            
            // sum to the same location for accumalation (integral), in line we only need dx 
            // TODO ATTENTION check if the minus sign is correct, moreover the conductivities and other constants outside the 
            // integral scale the results for having the right mV units of the ECG but here that is not neccesary as we scalate the 
            // the extracellular potential for plotting, so trends are ok but remember! magnitudes are not in mV

            // We populate the workgroup variable with shared memory/data to synchronously sum
            workgroup_data[LocalInvocationId.x].la = (ddx_V * grad_inv_r_arr[idx].la.x + ddy_V * grad_inv_r_arr[idx].la.y + ddz_V * grad_inv_r_arr[idx].la.z) * amplification;
            workgroup_data[LocalInvocationId.x].ra = (ddx_V * grad_inv_r_arr[idx].ra.x + ddy_V * grad_inv_r_arr[idx].ra.y + ddz_V * grad_inv_r_arr[idx].ra.z) * amplification;
            workgroup_data[LocalInvocationId.x].ll = (ddx_V * grad_inv_r_arr[idx].ll.x + ddy_V * grad_inv_r_arr[idx].ll.y + ddz_V * grad_inv_r_arr[idx].ll.z) * amplification;
            workgroup_data[LocalInvocationId.x].rl = (ddx_V * grad_inv_r_arr[idx].rl.x + ddy_V * grad_inv_r_arr[idx].rl.y + ddz_V * grad_inv_r_arr[idx].rl.z) * amplification;
            workgroup_data[LocalInvocationId.x].v1 = (ddx_V * grad_inv_r_arr[idx].v1.x + ddy_V * grad_inv_r_arr[idx].v1.y + ddz_V * grad_inv_r_arr[idx].v1.z) * amplification;
            workgroup_data[LocalInvocationId.x].v2 = (ddx_V * grad_inv_r_arr[idx].v2.x + ddy_V * grad_inv_r_arr[idx].v2.y + ddz_V * grad_inv_r_arr[idx].v2.z) * amplification;
            workgroup_data[LocalInvocationId.x].v3 = (ddx_V * grad_inv_r_arr[idx].v3.x + ddy_V * grad_inv_r_arr[idx].v3.y + ddz_V * grad_inv_r_arr[idx].v3.z) * amplification;
            workgroup_data[LocalInvocationId.x].v4 = (ddx_V * grad_inv_r_arr[idx].v4.x + ddy_V * grad_inv_r_arr[idx].v4.y + ddz_V * grad_inv_r_arr[idx].v4.z) * amplification;
            workgroup_data[LocalInvocationId.x].v5 = (ddx_V * grad_inv_r_arr[idx].v5.x + ddy_V * grad_inv_r_arr[idx].v5.y + ddz_V * grad_inv_r_arr[idx].v5.z) * amplification;
            workgroup_data[LocalInvocationId.x].v6 = (ddx_V * grad_inv_r_arr[idx].v6.x + ddy_V * grad_inv_r_arr[idx].v6.y + ddz_V * grad_inv_r_arr[idx].v6.z) * amplification;

            // Wait to for all invocations in the same workgroup to have the values computed and loaded
            workgroupBarrier();

            // We synchronously sum all values in the same workgroup, by using several invocations inside the workgroup
            // it maybe easy to make one invocation to sum all values but the for loop will have more loops so this is faster
            for (var current_size:u32 = ${workgroup_size} / 2; current_size > 0; current_size /= 2) {
                var sum_la:f32 = 0.0;
                var sum_ra:f32 = 0.0;
                var sum_ll:f32 = 0.0;
                var sum_rl:f32 = 0.0;
                var sum_v1:f32 = 0.0;
                var sum_v2:f32 = 0.0;
                var sum_v3:f32 = 0.0;
                var sum_v4:f32 = 0.0;
                var sum_v5:f32 = 0.0;
                var sum_v6:f32 = 0.0;

                if (LocalInvocationId.x < current_size) {
                    sum_la = workgroup_data[LocalInvocationId.x].la + workgroup_data[LocalInvocationId.x + current_size].la;
                    sum_ra = workgroup_data[LocalInvocationId.x].ra + workgroup_data[LocalInvocationId.x + current_size].ra;
                    sum_ll = workgroup_data[LocalInvocationId.x].ll + workgroup_data[LocalInvocationId.x + current_size].ll;
                    sum_rl = workgroup_data[LocalInvocationId.x].rl + workgroup_data[LocalInvocationId.x + current_size].rl;
                    sum_v1 = workgroup_data[LocalInvocationId.x].v1 + workgroup_data[LocalInvocationId.x + current_size].v1;
                    sum_v2 = workgroup_data[LocalInvocationId.x].v2 + workgroup_data[LocalInvocationId.x + current_size].v2;
                    sum_v3 = workgroup_data[LocalInvocationId.x].v3 + workgroup_data[LocalInvocationId.x + current_size].v3;
                    sum_v4 = workgroup_data[LocalInvocationId.x].v4 + workgroup_data[LocalInvocationId.x + current_size].v4;
                    sum_v5 = workgroup_data[LocalInvocationId.x].v5 + workgroup_data[LocalInvocationId.x + current_size].v5;
                    sum_v6 = workgroup_data[LocalInvocationId.x].v6 + workgroup_data[LocalInvocationId.x + current_size].v6;
                }
                // Wait until all invocations have finished reading from workgroup_data, and have calculated their respective sums
                workgroupBarrier();

                if (LocalInvocationId.x < current_size) {
                    workgroup_data[LocalInvocationId.x].la = sum_la;
                    workgroup_data[LocalInvocationId.x].ra = sum_ra;
                    workgroup_data[LocalInvocationId.x].ll = sum_ll;
                    workgroup_data[LocalInvocationId.x].rl = sum_rl;
                    workgroup_data[LocalInvocationId.x].v1 = sum_v1;
                    workgroup_data[LocalInvocationId.x].v2 = sum_v2;
                    workgroup_data[LocalInvocationId.x].v3 = sum_v3;
                    workgroup_data[LocalInvocationId.x].v4 = sum_v4;
                    workgroup_data[LocalInvocationId.x].v5 = sum_v5;
                    workgroup_data[LocalInvocationId.x].v6 = sum_v6;
                }
                // Wait for each invocation to finish one iteration of the loop, and to have finished writing to workgroup_data
                workgroupBarrier();
            }
            
            // Write the sum to the output
            if (LocalInvocationId.x == 0) {
                extracellular_potential_per_workgroup[WorkgroupID.x].la = workgroup_data[0].la;
                extracellular_potential_per_workgroup[WorkgroupID.x].ra = workgroup_data[0].ra;
                extracellular_potential_per_workgroup[WorkgroupID.x].ll = workgroup_data[0].ll;
                extracellular_potential_per_workgroup[WorkgroupID.x].rl = workgroup_data[0].rl;
                extracellular_potential_per_workgroup[WorkgroupID.x].v1 = workgroup_data[0].v1;
                extracellular_potential_per_workgroup[WorkgroupID.x].v2 = workgroup_data[0].v2;
                extracellular_potential_per_workgroup[WorkgroupID.x].v3 = workgroup_data[0].v3;
                extracellular_potential_per_workgroup[WorkgroupID.x].v4 = workgroup_data[0].v4;
                extracellular_potential_per_workgroup[WorkgroupID.x].v5 = workgroup_data[0].v5;
                extracellular_potential_per_workgroup[WorkgroupID.x].v6 = workgroup_data[0].v6;
            }
        }
        
    `;
}

export function computePECGGraphShader2(cellModel, nNodes, elemType, nWorkgroups, workgroup_size){

    var specificDefinitions;
    if (cellModel == 'Fenton_Karma'){
        specificDefinitions = fentonKarmaDefinitions;
    }else if (cellModel == 'Gaur'){
        specificDefinitions = gaurDefinitions;
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }


    if (elemType=='line'){
        return computeGradLine(specificDefinitions, nNodes, nWorkgroups, workgroup_size)
    }else if (elemType=='quad'){
        return computeGradQuad(specificDefinitions, nNodes, nWorkgroups, workgroup_size)
    }else if (elemType=='hexa'){
        return computeGradHexa(specificDefinitions, nNodes, nWorkgroups, workgroup_size)
    }else{
        throw new Error(`Unknown Elem Type "${elemType}"`)
    }
        
}

export function computePECGGraphShader3(nWorkgroupsComputeShader2, workgroup_size=10){

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

        @binding(0) @group(0) var<storage, read>       extracellular_potential_per_workgroup : array<ElectrodesScalar, ${nWorkgroupsComputeShader2}>;
        @binding(1) @group(0) var<storage, read_write> extracellular_potential : ElectrodesScalar;
        
        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop

            if (GlobalInvocationID.x==0){
                extracellular_potential.la = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.la += extracellular_potential_per_workgroup[i].la;    
                }
                return;
            }
            if (GlobalInvocationID.x==1){
                extracellular_potential.ra = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.ra += extracellular_potential_per_workgroup[i].ra;    
                }
                return;
            }
            if (GlobalInvocationID.x==2){
                extracellular_potential.ll = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.ll += extracellular_potential_per_workgroup[i].ll;    
                }
                return;
            }
            if (GlobalInvocationID.x==3){
                extracellular_potential.rl = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.rl += extracellular_potential_per_workgroup[i].rl;    
                }
                return;
            }
            if (GlobalInvocationID.x==4){
                extracellular_potential.v1 = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.v1 += extracellular_potential_per_workgroup[i].v1;    
                }
                return;
            }
            if (GlobalInvocationID.x==5){
                extracellular_potential.v2 = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.v2 += extracellular_potential_per_workgroup[i].v2;    
                }
                return;
            }
            if (GlobalInvocationID.x==6){
                extracellular_potential.v3 = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.v3 += extracellular_potential_per_workgroup[i].v3;    
                }
                return;
            }
            if (GlobalInvocationID.x==7){
                extracellular_potential.v4 = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.v4 += extracellular_potential_per_workgroup[i].v4;    
                }
                return;
            }
            if (GlobalInvocationID.x==8){
                extracellular_potential.v5 = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.v5 += extracellular_potential_per_workgroup[i].v5;    
                }
                return;
            }
            if (GlobalInvocationID.x==9){
                extracellular_potential.v6 = 0.0;
                for (var i = 0u; i < ${nWorkgroupsComputeShader2}; i++) {
                    extracellular_potential.v6 += extracellular_potential_per_workgroup[i].v6;    
                }
                return;
            }
            
        }
        
    `;
}

export function computePECGGraphShader4(numPoints, workgroup_size=64){

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
        @binding(4) @group(0) var<storage, read>       alpha_smoothing : f32;
        
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
            var min_value_to_plot:f32 = 0.0;
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
            var common_potential:f32 = (extracellular_potential.la + extracellular_potential.ra + extracellular_potential.ll) / 3;
            if (idx==(7*${numPoints}-1)){
                vois[idx] = extracellular_potential.v1 - common_potential;
                max_value_to_plot = 0.0;
                min_value_to_plot = -1.0;
            }
            // Lead V2 
            if (idx==(8*${numPoints}-1)){
                vois[idx] = extracellular_potential.v2 - common_potential;
                max_value_to_plot = 0.0;
                min_value_to_plot = -1.0;
            }
            // Lead V3
            if (idx==(9*${numPoints}-1)){
                vois[idx] = extracellular_potential.v3 - common_potential;
                max_value_to_plot = 0.0;
                min_value_to_plot = -1.0;
            }
            // Lead V4
            if (idx==(10*${numPoints}-1)){
                vois[idx] = extracellular_potential.v4 - common_potential;
                max_value_to_plot = 0.0;
                min_value_to_plot = -1.0;
            }
            // Lead V5
            if (idx==(11*${numPoints}-1)){
                vois[idx] = extracellular_potential.v5 - common_potential; 
                max_value_to_plot = 0.0;
                min_value_to_plot = -1.0;
            }
            // Lead V6
            if (idx==(12*${numPoints}-1)){
                vois[idx] = extracellular_potential.v6 - common_potential;
                max_value_to_plot = 0.0;
                min_value_to_plot = -1.0;
            }

            // Smoothing
            // this is more responsive as I can update alpha and is simpler to compute and fast, the user can instantanialy decide if smooth or not
            // and also the magnitude
            // is a good first smoothing method rather than using more sophisticated ones that can not be updated on the fly
            // block alpha to be 0 and 1 if it  zero the calculation is blocked! -> total smoothness if 1 is not smoothed at all
            vois[idx] = alpha_smoothing * vois[idx] + (1.0 - alpha_smoothing) * vois_copy[idx-1];
        
            // Pass to vois and normalize to plot
            if (vois[idx] < 3.40282346638528859812e+38f){ //Check for overflow, nan or inf positive oder negative
                //range needs to be [-0.5,0.5] as after the vertex_shader sums +/-0.5
                vois[idx] = ((vois[idx] - visualization.min) / (visualization.max - visualization.min)) - 0.5; 
                if (vois[idx] > max_value_to_plot){
                    vois[idx] = max_value_to_plot;
                }

                if (vois[idx] < min_value_to_plot){
                    vois[idx] = min_value_to_plot;
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