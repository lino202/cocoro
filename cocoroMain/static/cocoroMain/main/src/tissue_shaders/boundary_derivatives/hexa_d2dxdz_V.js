export function hexa_d2dxdz_V(nNodes){
    
    return /*wgsl*/`

        if ( (_i1_j_k1 < ${nNodes}) & (_1i_j_k1 < ${nNodes}) & (_i1_j_1k < ${nNodes}) & (_1i_j_1k < ${nNodes})) {
            // central, if all are available we are in plane so neumann condition not necessary there
            d2dxdz_V = (states[_i1_j_k1].vm - states[_1i_j_k1].vm - states[_i1_j_1k].vm + states[_1i_j_1k].vm ) / (4 * pow(integ.dx, 2));
        
        // Now we have 12 cases (4 corners defining the derivative that can or can not be present 
        // So 2^4 = 16 but 4 cases are not possible, all present, none present, just two diagonals present) TODO check implementation
        // all to zero for now, I know how to make the dxdy for the different cases taking fordward or backward FD but how to add
        // the neumann condition as Elvio thesis.
        }else{
            d2dxdz_V = 0.0;
        }

    `;
}
