export function hexa_d2dydy_V(nNodes){
    
    return /*wgsl*/`

        if ( (_i_1j_k < ${nNodes}) & (_i_j1_k < ${nNodes}) ) {
            // central
            d2dydy_V = (states[_i_1j_k].vm - 2 * states[idx].vm + states[_i_j1_k].vm) / pow(integ.dx,2);
        }else if (_i_j1_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dydy_V = (2*states[_i_j1_k].vm - 2*states[idx].vm) / pow(integ.dx,2);
        }else if (_i_1j_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dydy_V = (2*states[_i_1j_k].vm - 2*states[idx].vm) / pow(integ.dx,2);
        }else{
            d2dydy_V = 0.0; //You should never be here, TODO see error raising/handling or a way to do it
        }

    `;
}
