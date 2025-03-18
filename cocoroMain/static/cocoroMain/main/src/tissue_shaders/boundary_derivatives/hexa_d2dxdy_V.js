export function hexa_d2dxdy_V(nNodes){
    
    return /*wgsl*/`

        // We use the mirroring technique for generating ghost nodes when the node potential is not available
        // Similarly as for the quad
        var diag1_dxdy:f32 = 0.0;
        var diag2_dxdy:f32 = 0.0;

        if ( (_i1_j1_k < ${nNodes}) & (_1i_1j_k < ${nNodes}) ){
            diag1_dxdy = vms_copy[_i1_j1_k] + vms_copy[_1i_1j_k];
        }else if (_i1_j1_k < ${nNodes}){
            diag1_dxdy = 2 * vms_copy[_i1_j1_k];
        }else if (_1i_1j_k < ${nNodes}){
            diag1_dxdy = 2 * vms_copy[_1i_1j_k];
        }else{
            diag1_dxdy = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        if ( (_1i_j1_k < ${nNodes}) & (_i1_1j_k < ${nNodes}) ){
            diag2_dxdy = vms_copy[_1i_j1_k] + vms_copy[_i1_1j_k];
        }else if (_1i_j1_k < ${nNodes}){
            diag2_dxdy = 2 * vms_copy[_1i_j1_k];
        }else if (_i1_1j_k < ${nNodes}){
            diag2_dxdy = 2 * vms_copy[_i1_1j_k];
        }else{
            diag2_dxdy = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        d2dxdy_V = (diag1_dxdy - diag2_dxdy) / (4 * pow(integ.dx,2));

    `;
}
