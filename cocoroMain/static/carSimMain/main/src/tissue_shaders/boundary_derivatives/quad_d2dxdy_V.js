export function quad_d2dxdy_V(nNodes){
    
    return /*wgsl*/`

        // There is 12 possible cases
        // Holes of 1 square width in x or y are not allowed, as well as nodes representing regions with zero volumen as two squares in diagonal. 
        // TODO the problem with hole of 1 square width is due to we use the distance for defining the connections we need to use vtk cell2points o points2cells as per Hexa

        // TODO CHECK!!! There are implementations that I am not sure of...
        // For example in the bottom left corner, I use fordward finite differences and according neuman i,j = i+1 and at the same time i,j = i,j+1
        // so I have written the d2dxdy = i+1,j+1 - i+1,j - i,j+1 + i,j ==> i+1,j+1 - i,j, (!!! attention we use i,j as it should be equal to i+1,j and i,j+1 )
        // is this right?
        
        if ( (_i_j1 < ${nNodes}) & (_i1_j1 <  ${nNodes}) & (_i1_j <  ${nNodes}) & (_i1_1j <  ${nNodes}) & 
             (_i_1j < ${nNodes}) & (_1i_1j >= ${nNodes}) & (_1i_j >= ${nNodes}) & (_1i_j1 >= ${nNodes}) ) {
            // CASE 1 left boundary
            d2dxdy_V = (states[_i1_j1].vm - states[_i1_1j].vm) / (2 * pow(integ.dx,2));

        }else if ( (_i_j1 < ${nNodes}) & (_i1_j1 >= ${nNodes}) & (_i1_j >= ${nNodes}) & (_i1_1j >= ${nNodes}) & 
                   (_i_1j < ${nNodes}) & (_1i_1j <  ${nNodes}) & (_1i_j <  ${nNodes}) & (_1i_j1 <  ${nNodes}) ) {
            // CASE 2 right boundary
            d2dxdy_V = (states[_1i_1j].vm - states[_1i_j1].vm) / (2 * pow(integ.dx,2));
        
        }else if ( (_i_j1 >= ${nNodes}) & (_i1_j1 >= ${nNodes}) & (_i1_j < ${nNodes}) & (_i1_1j <  ${nNodes}) & 
                   (_i_1j <  ${nNodes}) & (_1i_1j <  ${nNodes}) & (_1i_j < ${nNodes}) & (_1i_j1 >= ${nNodes}) ) {
            // CASE 3 top boundary
            d2dxdy_V = (states[_1i_1j].vm - states[_i1_1j].vm) / (2 * pow(integ.dx,2));
        
        }else if ( (_i_j1 <  ${nNodes}) & (_i1_j1 <  ${nNodes}) & (_i1_j < ${nNodes}) & (_i1_1j >= ${nNodes}) & 
                   (_i_1j >= ${nNodes}) & (_1i_1j >= ${nNodes}) & (_1i_j < ${nNodes}) & (_1i_j1 <  ${nNodes}) ) {
            // CASE 4 bottom boundary 
            d2dxdy_V = (states[_i1_j1].vm - states[_1i_j1].vm) / (2 * pow(integ.dx,2));

        }else if ( (_i_j1 <  ${nNodes}) & (_i1_j1 <  ${nNodes}) & (_i1_j <  ${nNodes}) & (_i1_1j >= ${nNodes}) & 
                   (_i_1j >= ${nNodes}) & (_1i_1j >= ${nNodes}) & (_1i_j >= ${nNodes}) & (_1i_j1 >= ${nNodes}) ) {
            // CASE 5 outer bottom-left corner 
            d2dxdy_V = (states[_i1_j1].vm - states[idx].vm) / pow(integ.dx,2);
        
        }else if ( (_i_j1 <  ${nNodes}) & (_i1_j1 >= ${nNodes}) & (_i1_j >= ${nNodes}) & (_i1_1j >= ${nNodes}) & 
                   (_i_1j >= ${nNodes}) & (_1i_1j >= ${nNodes}) & (_1i_j <  ${nNodes}) & (_1i_j1 <  ${nNodes}) ) {
            // CASE 6 outer bottom-right corner 
            d2dxdy_V = (states[idx].vm - states[_1i_j1].vm) / pow(integ.dx,2);
        
        }else if ( (_i_j1 >= ${nNodes}) & (_i1_j1 >= ${nNodes}) & (_i1_j >= ${nNodes}) & (_i1_1j >= ${nNodes}) & 
                   (_i_1j <  ${nNodes}) & (_1i_1j <  ${nNodes}) & (_1i_j <  ${nNodes}) & (_1i_j1 >= ${nNodes}) ) {
            // CASE 7 outer top-right corner 
            d2dxdy_V = (states[_1i_1j].vm - states[idx].vm) / pow(integ.dx,2);

        }else if ( (_i_j1 >= ${nNodes}) & (_i1_j1 >= ${nNodes}) & (_i1_j <  ${nNodes}) & (_i1_1j <  ${nNodes}) & 
                   (_i_1j <  ${nNodes}) & (_1i_1j >= ${nNodes}) & (_1i_j >= ${nNodes}) & (_1i_j1 >= ${nNodes}) ) {
            // CASE 8 outer top-left corner     
            d2dxdy_V = (states[idx].vm - states[_i1_1j].vm) / pow(integ.dx,2);
        
        }else{
            // TODO check how to correctly do this implementation, for now all zero
            // CASE 9 inner bottom-left corner 
            // CASE 10 inner bottom-right corner    
            // CASE 11 inner top-right corner
            // CASE 12 inner top-left corner
            d2dxdy_V = 0.0;
        }

    `;
}
