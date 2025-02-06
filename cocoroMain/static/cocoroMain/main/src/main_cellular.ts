

import { checkWebGPU } from './helpers/helper';
import { SimCell } from './main_modules/simCell';
import {initGUI4UniqueCellModel, manageDataFromGUI, cellObj } from './helpers/manageCellModelGUI';
import { GUI } from 'dat.gui';
import $ from 'jquery';

//  Global Variables ------------
const visualParams = {
    min   : -100,
    max   : 60,
    plot_dt  : 1,     // This should be in ms if dt is in ms
    num_points : 3000
}
const gpuSettings = {
    workgroup_size   : 64,
}

const saveSettings = {
    start   : -1,
    end   : -1,
    save_name: 'cell_sim',
}

const debugSettings = {
    start   : -1,
    end   : -1,
    state_name : 'vm',
}


const gui = new GUI();



// Main ----------------
(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

$(document).ready(function(){
    console.log("WE ARE READY!!");
    initGUI4UniqueCellModel(gui, gpuSettings, visualParams, 'Cellular', saveSettings, debugSettings);
});

$('#btn-simulate').on('click',()=>{

    var cellObj:cellObj = manageDataFromGUI(gui);
    SimCell(gui, cellObj.cellModel, cellObj.states, cellObj.constants, cellObj.stim, visualParams);
});