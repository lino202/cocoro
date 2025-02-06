import { quad_d2dxdx_V } from './boundary_derivatives/quad_d2dxdx_V.js';
import { quad_d2dydy_V } from './boundary_derivatives/quad_d2dydy_V.js';
import { quad_d2dxdy_V } from './boundary_derivatives/quad_d2dxdy_V.js';


export function getSecondDerivativesQuad(nNodes){
    
    var wgsl_quad_d2dxdx_V = quad_d2dxdx_V(nNodes);
    var wgsl_quad_d2dydy_V = quad_d2dydy_V(nNodes);
    var wgsl_quad_d2dxdy_V = quad_d2dxdy_V(nNodes);

    return /*wgsl*/`

        if ( (_i_j1 < ${nNodes}) & (_i1_j1 < ${nNodes}) & (_i1_j < ${nNodes}) & (_i1_1j < ${nNodes}) & (_i_1j < ${nNodes}) & (_1i_1j < ${nNodes}) & (_1i_j < ${nNodes}) & (_1i_j1 < ${nNodes}) ) {
            // here I am in the center of domain
            d2dxdx_V = (vms_copy[_1i_j] - 2 * vms_copy[idx] + vms_copy[_i1_j]) / pow(integ.dx,2);
            d2dydy_V = (vms_copy[_i_1j] - 2 * vms_copy[idx] + vms_copy[_i_j1]) / pow(integ.dx,2);
            d2dxdy_V = (vms_copy[_i1_j1] - vms_copy[_1i_j1] - vms_copy[_i1_1j] + vms_copy[_1i_1j] ) / (4 * pow(integ.dx, 2));    
        
        }else{
            // Here I am in anywhere in the domain's boundary
            
            // We have 12 cases (4 squares that can or can not be present 
            // So 2^4 = 16 but 4 cases are not possible or already taken into account, all present, none present, just two diagonals present) 
            ${wgsl_quad_d2dxdx_V}
            ${wgsl_quad_d2dydy_V}
            ${wgsl_quad_d2dxdy_V}
        }

    `;
}
