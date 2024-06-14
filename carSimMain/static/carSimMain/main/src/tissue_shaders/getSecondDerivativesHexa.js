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

            // here I am in the center of domain
            d2dxdx_V = (states[_1i_j_k].vm - 2 * states[idx].vm + states[_i1_j_k].vm) / pow(integ.dx,2);
            d2dydy_V = (states[_i_1j_k].vm - 2 * states[idx].vm + states[_i_j1_k].vm) / pow(integ.dx,2);
            d2dzdz_V = (states[_i_j_1k].vm - 2 * states[idx].vm + states[_i_j_k1].vm) / pow(integ.dx,2);
            d2dxdy_V = (states[_i1_j1_k].vm - states[_1i_j1_k].vm - states[_i1_1j_k].vm + states[_1i_1j_k].vm ) / (4 * pow(integ.dx, 2));
            d2dxdz_V = (states[_i1_j_k1].vm - states[_1i_j_k1].vm - states[_i1_j_1k].vm + states[_1i_j_1k].vm ) / (4 * pow(integ.dx, 2));
            d2dydz_V = (states[_i_j1_k1].vm - states[_i_1j_k1].vm - states[_i_j1_1k].vm + states[_i_1j_1k].vm ) / (4 * pow(integ.dx, 2));

        
        }else{
            // Here I am in anywhere in the domain's boundary
            ${wgsl_hexa_d2dxdx_V}
            ${wgsl_hexa_d2dydy_V}
            ${wgsl_hexa_d2dzdz_V}
            ${wgsl_hexa_d2dxdy_V}
            ${wgsl_hexa_d2dxdz_V}
            ${wgsl_hexa_d2dydz_V}
        
        }

    `;
}
