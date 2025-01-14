export function hexa_d2dxdx_V(nNodes){
    
    return /*wgsl*/`

        if ( (_1i_j_k < ${nNodes}) & (_i1_j_k < ${nNodes}) ) {
            // central
            d2dxdx_V = (states[_1i_j_k].vm - 2 * states[idx].vm + states[_i1_j_k].vm) / pow(integ.dx,2);
        }else if (_i1_j_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dxdx_V = (2*states[_i1_j_k].vm - 2*states[idx].vm) / pow(integ.dx,2);
        }else if (_1i_j_k < ${nNodes}) {
            // neumann condition gives Vn-1 = Vn+1
            d2dxdx_V = (2*states[_1i_j_k].vm - 2*states[idx].vm) / pow(integ.dx,2);
        }else{
            d2dxdx_V = 0.0; //You should never be here, TODO see error raising/handling or a way to do it
        }

    `;
}
