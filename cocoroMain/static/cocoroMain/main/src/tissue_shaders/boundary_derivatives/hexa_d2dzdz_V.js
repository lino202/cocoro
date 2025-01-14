export function hexa_d2dzdz_V(nNodes){
    
    return /*wgsl*/`

        if ( (_i_j_1k < ${nNodes}) & (_i_j_k1 < ${nNodes}) ) {
            // central
            d2dzdz_V = (states[_i_j_1k].vm - 2 * states[idx].vm + states[_i_j_k1].vm) / pow(integ.dx,2);
        }else if (_i_j_k1 < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dzdz_V = (2*states[_i_j_k1].vm - 2*states[idx].vm) / pow(integ.dx,2);
        }else if (_i_j_1k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dzdz_V = (2*states[_i_j_1k].vm - 2*states[idx].vm) / pow(integ.dx,2);
        }else{
            d2dzdz_V = 0.0; //You should never be here, TODO see error raising/handling or a way to do it
        }

    `;
}
