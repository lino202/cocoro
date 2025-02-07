export function hexa_d2dydy_V(nNodes){
    
    return /*wgsl*/`

        if ( (_i_1j_k < ${nNodes}) & (_i_j1_k < ${nNodes}) ) {
            // central
            d2dydy_V = (vms_copy[_i_1j_k] - 2 * vms_copy[idx] + vms_copy[_i_j1_k]) / pow(integ.dx,2);
        }else if (_i_j1_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dydy_V = (2*vms_copy[_i_j1_k] - 2*vms_copy[idx]) / pow(integ.dx,2);
        }else if (_i_1j_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dydy_V = (2*vms_copy[_i_1j_k] - 2*vms_copy[idx]) / pow(integ.dx,2);
        }else{
            d2dydy_V = 0.0; //You should never be here, TODO see error raising/handling or a way to do it
        }

    `;
}
