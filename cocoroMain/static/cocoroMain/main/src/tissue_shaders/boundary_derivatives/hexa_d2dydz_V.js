export function hexa_d2dydz_V(nNodes){
    
    return /*wgsl*/`

        // We use the mirroring technique for generating ghost nodes when the node potential is not available
        // Similarly as for the quad
        var diag1_dydz:f32 = 0.0;
        var diag2_dydz:f32 = 0.0;

        if ( (_i_j1_k1 < ${nNodes}) & (_i_1j_1k < ${nNodes}) ){
            diag1_dydz = vms_copy[_i_j1_k1] + vms_copy[_i_1j_1k];
        }else if (_i_j1_k1 < ${nNodes}){
            diag1_dydz = 2 * vms_copy[_i_j1_k1];
        }else if (_i_1j_1k < ${nNodes}){
            diag1_dydz = 2 * vms_copy[_i_1j_1k];
        }else{
            diag1_dydz = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        if ( (_i_1j_k1 < ${nNodes}) & (_i_j1_1k < ${nNodes}) ){
            diag2_dydz = vms_copy[_i_1j_k1] + vms_copy[_i_j1_1k];
        }else if (_i_1j_k1 < ${nNodes}){
            diag2_dydz = 2 * vms_copy[_i_1j_k1];
        }else if (_i_j1_1k < ${nNodes}){
            diag2_dydz = 2 * vms_copy[_i_j1_1k];
        }else{
            diag2_dydz = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        d2dydz_V = (diag1_dydz - diag2_dydz) / (4 * pow(integ.dx,2));

    `;
}
