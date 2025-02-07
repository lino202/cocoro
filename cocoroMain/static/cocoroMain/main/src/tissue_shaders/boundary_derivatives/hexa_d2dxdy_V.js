export function hexa_d2dxdy_V(nNodes){
    
    return /*wgsl*/`

        if ( (_i1_j1_k < ${nNodes}) & (_1i_j1_k < ${nNodes}) & (_i1_1j_k < ${nNodes}) & (_1i_1j_k < ${nNodes})) {
            // central, if all are available we are in plane so neumann condition not necessary there
            d2dxdy_V = (vms_copy[_i1_j1_k] - vms_copy[_1i_j1_k] - vms_copy[_i1_1j_k] + vms_copy[_1i_1j_k] ) / (4 * pow(integ.dx, 2));
        
        // Now we have 12 cases (4 corners defining the derivative that can or can not be present 
        // So 2^4 = 16 but 4 cases are not possible, all present, none present, just two diagonals present) TODO check implementation
        // all to zero for now, I know how to make the dxdy for the different cases taking fordward or backward FD but how to add
        // the neumann condition as Elvio thesis.
        }else{
            d2dxdy_V = 0.0;
        }

    `;
}
