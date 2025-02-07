export function hexa_d2dxdx_V(nNodes){
    
    return /*wgsl*/`

        if ( (_1i_j_k < ${nNodes}) & (_i1_j_k < ${nNodes}) ) {
            // central
            d2dxdx_V = (vms_copy[_1i_j_k] - 2 * vms_copy[idx] + vms_copy[_i1_j_k]) / pow(integ.dx,2);
        }else if (_i1_j_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dxdx_V = (2*vms_copy[_i1_j_k] - 2*vms_copy[idx]) / pow(integ.dx,2);
        }else if (_1i_j_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dxdx_V = (2*vms_copy[_1i_j_k] - 2*vms_copy[idx]) / pow(integ.dx,2);
        }else{
            d2dxdx_V = 0.0; //You should never be here, TODO see error raising/handling or a way to do it
        }

    `;
}
