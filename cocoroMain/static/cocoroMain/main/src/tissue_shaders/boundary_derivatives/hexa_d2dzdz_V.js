export function hexa_d2dzdz_V(nNodes){
    
    return /*wgsl*/`

        if ( (_i_j_1k < ${nNodes}) & (_i_j_k1 < ${nNodes}) ) {
            // central
            d2dzdz_V = (vms_copy[_i_j_1k] - 2 * vms_copy[idx] + vms_copy[_i_j_k1]) / pow(integ.dx,2);
        }else if (_i_j_k1 < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dzdz_V = (2*vms_copy[_i_j_k1] - 2*vms_copy[idx]) / pow(integ.dx,2);
        }else if (_i_j_1k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dzdz_V = (2*vms_copy[_i_j_1k] - 2*vms_copy[idx]) / pow(integ.dx,2);
        }else{
            d2dzdz_V = 0.0; //You should never be here, TODO see error raising/handling or a way to do it
        }

    `;
}
