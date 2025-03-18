export function quad_d2dxdy_V(nNodes){
    
    return /*wgsl*/`

        // There are 12 possible cases
        // We use the mirroring technique for generating ghost nodes when the node potential is not available
        // For the 4 nodes in the corners of the stencil we have 12 cases, (4*4=16 but 4 cases are not possible or already took into account)
        // The 4 not possible cases are: all present, none present, just two diagonals present (2 cases)
        // Moreover the d2dxdy_V central scheme aproximation takes into account the corner values, we can separate this in diag1 and diag2 to ease the code
        var diag1:f32 = 0.0;
        var diag2:f32 = 0.0;

        if ( (_i1_j1 < ${nNodes}) & (_1i_1j < ${nNodes}) ){
            diag1 = vms_copy[_i1_j1] + vms_copy[_1i_1j];
        }else if (_i1_j1 < ${nNodes}){
            diag1 = 2 * vms_copy[_i1_j1];
        }else if (_1i_1j < ${nNodes}){
            diag1 = 2 * vms_copy[_1i_1j];
        }else{
            diag1 = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        if ( (_1i_j1 < ${nNodes}) & (_i1_1j < ${nNodes}) ){
            diag2 = vms_copy[_1i_j1] + vms_copy[_i1_1j];
        }else if (_1i_j1 < ${nNodes}){
            diag2 = 2 * vms_copy[_1i_j1];
        }else if (_i1_1j < ${nNodes}){
            diag2 = 2 * vms_copy[_i1_1j];
        }else{
            diag2 = 0.0; //You can be here in the case of outer corner!! ATTENTION
        }

        d2dxdy_V = (diag1 - diag2) / (4 * pow(integ.dx,2));
    `;
}
