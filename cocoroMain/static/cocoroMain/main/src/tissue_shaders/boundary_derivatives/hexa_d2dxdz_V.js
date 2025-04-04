export function hexa_d2dxdz_V(nNodes){
    
    return /*wgsl*/`

        // We use the mirroring technique for generating ghost nodes when the node potential is not available
        // Similarly as for the quad
        var diag1_dxdz:f32 = 0.0;
        var diag2_dxdz:f32 = 0.0;

        if ( (_i1_j_k1 < ${nNodes}) & (_1i_j_1k < ${nNodes}) ){
            diag1_dxdz = vms_copy[_i1_j_k1] + vms_copy[_1i_j_1k];
        }else if (_i1_j_k1 < ${nNodes}){
            diag1_dxdz = 2 * vms_copy[_i1_j_k1];
        }else if (_1i_j_1k < ${nNodes}){
            diag1_dxdz = 2 * vms_copy[_1i_j_1k];
        }else{
            diag1_dxdz = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        if ( (_1i_j_k1 < ${nNodes}) & (_i1_j_1k < ${nNodes}) ){
            diag2_dxdz = vms_copy[_1i_j_k1] + vms_copy[_i1_j_1k];
        }else if (_1i_j_k1 < ${nNodes}){
            diag2_dxdz = 2 * vms_copy[_1i_j_k1];
        }else if (_i1_j_1k < ${nNodes}){
            diag2_dxdz = 2 * vms_copy[_i1_j_1k];
        }else{
            diag2_dxdz = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        if ((diag1_dxdz == 0.0) | (diag2_dxdz == 0.0)){
            d2dxdz_V = 0.0;
        }else{
            d2dxdz_V = (diag1_dxdz - diag2_dxdz) / (4 * pow(integ.dx,2));
        }

    `;
}
