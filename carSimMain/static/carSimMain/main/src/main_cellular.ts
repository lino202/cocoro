

import { checkWebGPU } from './helpers/helper';
import { SimCell } from './main_modules/simCell';
import { GUI } from 'dat.gui';
import $ from 'jquery';

(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

const gui             = new GUI();

$('#btn-simulate').on('click',()=>{
    SimCell(gui);
});

// function printCellModel(simGUIFolder: unknown){
//     console.log(simGUIFolder.__controllers[0].__select.value);
// }

$(document).ready(function(){
    console.log("WE ARE READY!!");

    const cellModel = 'tenTusscher';

    const visualParams = {
        voiMin   : -2.,
        voiMax   : 2.,
    }
    var cellModelsGui = { Cell_Model: 'tenTusscher'}


    //Dat.gui definition
    const visualGUIFolder = gui.addFolder('Visualization');
    const simGUIFolder    = gui.addFolder('Simulation');
    Object.keys(visualParams).forEach((k) => {visualGUIFolder.add(visualParams, k);});
    simGUIFolder.add(cellModelsGui, 'Cell_Model', ['tenTusscher','Gaur','blabla'] );
});