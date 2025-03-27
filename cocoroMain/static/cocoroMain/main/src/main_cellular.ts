

import { checkWebGPU } from './helpers/helper';
import { CellObj } from './helpers/interfaces'
import CellSim from './main_modules/CellSim';
import {initGUI4UniqueCellModel, manageDataFromGUI } from './helpers/manageCellModelGUI';
import { GUI } from 'dat.gui';
import $ from 'jquery';

//  Global Variables ------------
// these variables can be changed by the user before starting the simulation
const visualParams = {
    min   : -100,
    max   : 60,
    var_name: 'vm',
    num_points : 10000,
    plot_dt  : 1,     // This should be in ms if dt is in ms and in last position
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

$('#btn-simulate').on('click',async ()=>{

    var cellObj:CellObj = manageDataFromGUI(gui);

    // Init simulator and start simulation
    const simulator:CellSim = await CellSim.create(gui, cellObj);
    requestAnimationFrame(simulator.simulate);
});