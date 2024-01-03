export function get2DSecondDerivatives(nNodes){
    
    
    return /*wgsl*/`

        if ( (i_j1 < ${nNodes}) & (i1_j1 < ${nNodes}) & (i1_j < ${nNodes}) & (i1_jminus1 < ${nNodes}) & (i_jminus1 < ${nNodes}) & (iminus1_jminus1 < ${nNodes}) & (iminus1_j < ${nNodes}) & (iminus1_j1 < ${nNodes}) ) {
            // here I am in the center of domain
        
            d2dxdx_V = (states[iminus1_j].vm - 2 * states[idx].vm + states[i1_j].vm) / pow(integ.dx,2);
            d2dxdy_V = (states[i1_j1].vm - states[iminus1_j1].vm - states[i1_jminus1].vm + states[iminus1_jminus1].vm ) / (4 * pow(integ.dx, 2));
            d2dydy_V = (states[i_jminus1].vm - 2 * states[idx].vm + states[i_j1].vm) / pow(integ.dx,2);    
        
        }else{
            // Here I am in anywhere in the domain's boundary, ddx_V and ddy_V = 0 Newmann condition in (i,j)!!
            
            // TODO CHECK!!! There are implementations that I am not sure of.. 
            // For ex in left boundary j+1 and j-1 are defined however by neumann they should be equal but how do I force this?
            // Another case is for example in the bottom left corner, I use fordward finite differences and according neuman i,j = i+1,j = i,j+1
            // so I have written the d2dxdy i+1,j+1 - i+1,j - i,j+1 + i,j ==> i+1,j+1 - i,j, (!!! attention we use i,j as it should be equal to i+1,j and i,j+1 )
            // is this right?
            // Pay also attention that holes of 1 square width in x or y are not allowed!! as the derivatives are computed as the hole does not exist!!
            // So make holes of at least to squares-width in x and y
            
            if ( (i_j1<${nNodes}) & (i1_j1<${nNodes}) & (i1_j<${nNodes}) & (i1_jminus1<${nNodes}) & (i_jminus1<${nNodes}) & (iminus1_jminus1>=${nNodes}) & (iminus1_j>=${nNodes}) & (iminus1_j1>=${nNodes}) ) {
                // Here I am in the left boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (2 * states[i1_j].vm - 2 * states[idx].vm ) / pow(integ.dx,2);
                d2dydy_V = (states[i_jminus1].vm - 2 * states[idx].vm + states[i_j1].vm) / pow(integ.dx,2); 
                d2dxdy_V = (states[i1_j1].vm - states[i1_jminus1].vm) / (2 * pow(integ.dx,2));
            }else if ( (i_j1<${nNodes}) & (i1_j1>=${nNodes}) & (i1_j>=${nNodes}) & (i1_jminus1>=${nNodes}) & (i_jminus1<${nNodes}) & (iminus1_jminus1<${nNodes}) & (iminus1_j<${nNodes}) & (iminus1_j1<${nNodes}) ) {
                // Here I am in the right boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (2 * states[iminus1_j].vm - 2 * states[idx].vm ) / pow(integ.dx,2);
                d2dydy_V = (states[i_jminus1].vm - 2 * states[idx].vm + states[i_j1].vm) / pow(integ.dx,2); 
                d2dxdy_V = (states[iminus1_jminus1].vm - states[iminus1_j1].vm) / (2 * pow(integ.dx,2));
            }else if ( (i_j1>=${nNodes}) & (i1_j1>=${nNodes}) & (i1_j<${nNodes}) & (i1_jminus1<${nNodes}) & (i_jminus1<${nNodes}) & (iminus1_jminus1<${nNodes}) & (iminus1_j<${nNodes}) & (iminus1_j1>=${nNodes}) ) {
                // Here I am in the up boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (states[iminus1_j].vm - 2 * states[idx].vm + states[i1_j].vm) / pow(integ.dx,2);
                d2dydy_V =  (2 * states[i_jminus1].vm - 2 * states[idx].vm ) / pow(integ.dx,2); 
                d2dxdy_V = (states[iminus1_jminus1].vm - states[i1_jminus1].vm) / (2 * pow(integ.dx,2));
            }else if ( (i_j1<${nNodes}) & (i1_j1<${nNodes}) & (i1_j<${nNodes}) & (i1_jminus1>=${nNodes}) & (i_jminus1>=${nNodes}) & (iminus1_jminus1>=${nNodes}) & (iminus1_j<${nNodes}) & (iminus1_j1<${nNodes}) ) {
                // Here I am in the bottom boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (states[iminus1_j].vm - 2 * states[idx].vm + states[i1_j].vm) / pow(integ.dx,2);
                d2dydy_V =  (2 * states[i_j1].vm - 2 * states[idx].vm ) / pow(integ.dx,2); 
                d2dxdy_V = (states[i1_j1].vm - states[iminus1_j1].vm) / (2 * pow(integ.dx,2));
            }else if ( (i_j1<${nNodes}) & (i1_j1<${nNodes}) & (i1_j<${nNodes}) & (i1_jminus1>=${nNodes}) & (i_jminus1>=${nNodes}) & (iminus1_jminus1>=${nNodes}) & (iminus1_j>=${nNodes}) & (iminus1_j1>=${nNodes}) ) {
                // Here I am in the bottom-left corner boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (2 * states[i1_j].vm - 2 * states[idx].vm) / pow(integ.dx,2);
                d2dydy_V = (2 * states[i_j1].vm - 2 * states[idx].vm) / pow(integ.dx,2); 
                d2dxdy_V = (states[i1_j1].vm - states[idx].vm) / pow(integ.dx,2);
            }else if ( (i_j1<${nNodes}) & (i1_j1>=${nNodes}) & (i1_j>=${nNodes}) & (i1_jminus1>=${nNodes}) & (i_jminus1>=${nNodes}) & (iminus1_jminus1>=${nNodes}) & (iminus1_j<${nNodes}) & (iminus1_j1<${nNodes}) ) {
                // Here I am in the bottom-right corner boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (2 * states[iminus1_j].vm - 2 * states[idx].vm) / pow(integ.dx,2);
                d2dydy_V = (2 * states[i_j1].vm - 2 * states[idx].vm) / pow(integ.dx,2); 
                d2dxdy_V = (states[idx].vm - states[iminus1_j1].vm) / pow(integ.dx,2);
            }else if ( (i_j1>=${nNodes}) & (i1_j1>=${nNodes}) & (i1_j>=${nNodes}) & (i1_jminus1>=${nNodes}) & (i_jminus1<${nNodes}) & (iminus1_jminus1<${nNodes}) & (iminus1_j<${nNodes}) & (iminus1_j1>=${nNodes}) ) {
                // Here I am in the up-right corner boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (2 * states[iminus1_j].vm - 2 * states[idx].vm) / pow(integ.dx,2);
                d2dydy_V = (2 * states[i_jminus1].vm - 2 * states[idx].vm) / pow(integ.dx,2); 
                d2dxdy_V = (states[iminus1_jminus1].vm - states[idx].vm) / pow(integ.dx,2);
            }else if ( (i_j1>=${nNodes}) & (i1_j1>=${nNodes}) & (i1_j<${nNodes}) & (i1_jminus1<${nNodes}) & (i_jminus1<${nNodes}) & (iminus1_jminus1>=${nNodes}) & (iminus1_j>=${nNodes}) & (iminus1_j1>=${nNodes}) ) {
                // Here I am in the up-left corner boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (2 * states[i1_j].vm - 2 * states[idx].vm) / pow(integ.dx,2);
                d2dydy_V = (2 * states[i_jminus1].vm - 2 * states[idx].vm) / pow(integ.dx,2); 
                d2dxdy_V = (states[idx].vm - states[i1_jminus1].vm) / pow(integ.dx,2);
            }else if ( (i_j1<${nNodes}) & (i1_j1<${nNodes}) & (i1_j<${nNodes}) & (i1_jminus1>=${nNodes}) & (i_jminus1<${nNodes}) & (iminus1_jminus1<${nNodes}) & (iminus1_j<${nNodes}) & (iminus1_j1<${nNodes}) ) {
                // Here I am in the inner up-left corner boundary
                // Get d2dxdx_V, d2dydy_V and d2dxdy_V = d2dydx_V
                d2dxdx_V = (states[iminus1_j].vm - 2 * states[idx].vm + states[i1_j].vm) / pow(integ.dx,2);
                d2dydy_V = (states[i_jminus1].vm - 2 * states[idx].vm + states[i_j1].vm) / pow(integ.dx,2);    
                d2dxdy_V = (states[iminus1_jminus1].vm - states[iminus1_j1].vm) / (2*pow(integ.dx,2));
            }// TODO Also inner up-right, bottom-right, bottom-left and inners arriving to the change line
        }

    `;
}
