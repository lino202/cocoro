import { hexa_d2dxdx_V } from './boundary_derivatives/hexa_d2dxdx_V.js';
import { hexa_d2dydy_V } from './boundary_derivatives/hexa_d2dydy_V.js';
import { hexa_d2dzdz_V } from './boundary_derivatives/hexa_d2dzdz_V.js';
import { hexa_d2dxdy_V } from './boundary_derivatives/hexa_d2dxdy_V.js';
import { hexa_d2dxdz_V } from './boundary_derivatives/hexa_d2dxdz_V.js';
import { hexa_d2dydz_V } from './boundary_derivatives/hexa_d2dydz_V.js';

export function getSecondDerivativesHexa(nNodes){

    var wgsl_hexa_d2dxdx_V = hexa_d2dxdx_V(nNodes);
    var wgsl_hexa_d2dydy_V = hexa_d2dydy_V(nNodes);
    var wgsl_hexa_d2dzdz_V = hexa_d2dzdz_V(nNodes);
    var wgsl_hexa_d2dxdy_V = hexa_d2dxdy_V(nNodes);
    var wgsl_hexa_d2dxdz_V = hexa_d2dxdz_V(nNodes);
    var wgsl_hexa_d2dydz_V = hexa_d2dydz_V(nNodes);
    
    return /*wgsl*/`

        if ( (_i_j1_k  < ${nNodes}) & (_i1_j1_k  < ${nNodes}) & (_i1_j_k   < ${nNodes}) & (_i1_1j_k  < ${nNodes}) & (_i_1j_k   < ${nNodes}) & 
            (_1i_1j_k  < ${nNodes}) & (_1i_j_k   < ${nNodes}) & (_1i_j1_k  < ${nNodes}) & (_i_j_k1   < ${nNodes}) & (_i_j1_k1  < ${nNodes}) &
            (_i1_j1_k1 < ${nNodes}) & (_i1_j_k1  < ${nNodes}) & (_i1_1j_k1 < ${nNodes}) & (_i_1j_k1  < ${nNodes}) & (_1i_1j_k1 < ${nNodes}) &
            (_1i_j_k1  < ${nNodes}) & (_1i_j1_k1 < ${nNodes}) & (_i_j_1k   < ${nNodes}) & (_i_j1_1k  < ${nNodes}) & (_i1_j1_1k < ${nNodes}) &
            (_i1_j_1k  < ${nNodes}) & (_i1_1j_1k < ${nNodes}) & (_i_1j_1k  < ${nNodes}) & (_1i_1j_1k < ${nNodes}) & (_1i_j_1k  < ${nNodes}) &
            (_1i_j1_1k < ${nNodes})) {

            // here we are in the center of domain
            d2dxdx_V = (vms_copy[_1i_j_k] - 2 * vms_copy[idx] + vms_copy[_i1_j_k]) / pow(integ.dx,2);
            d2dydy_V = (vms_copy[_i_1j_k] - 2 * vms_copy[idx] + vms_copy[_i_j1_k]) / pow(integ.dx,2);
            d2dzdz_V = (vms_copy[_i_j_1k] - 2 * vms_copy[idx] + vms_copy[_i_j_k1]) / pow(integ.dx,2);
            d2dxdy_V = (vms_copy[_i1_j1_k] - vms_copy[_1i_j1_k] - vms_copy[_i1_1j_k] + vms_copy[_1i_1j_k] ) / (4 * pow(integ.dx, 2));
            d2dxdz_V = (vms_copy[_i1_j_k1] - vms_copy[_1i_j_k1] - vms_copy[_i1_j_1k] + vms_copy[_1i_j_1k] ) / (4 * pow(integ.dx, 2));
            d2dydz_V = (vms_copy[_i_j1_k1] - vms_copy[_i_1j_k1] - vms_copy[_i_j1_1k] + vms_copy[_i_1j_1k] ) / (4 * pow(integ.dx, 2));

        
        }else{
            // Here we are in anywhere in the domain's boundary
            ${wgsl_hexa_d2dxdx_V}
            ${wgsl_hexa_d2dydy_V}
            ${wgsl_hexa_d2dzdz_V}
            ${wgsl_hexa_d2dxdy_V}
            ${wgsl_hexa_d2dxdz_V}
            ${wgsl_hexa_d2dydz_V}
        
        }

    `;
}
