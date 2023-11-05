

import { checkWebGPU } from './helpers/helper';
import { SimCell } from './main_modules/simCell';
import {cellTypesFK, cellModelParamsFKBR, cellModelParamsFKMBR, cellModelParamsFKGP, cellModelParamsFKMLR1} from './cellModels/fenton_karma'
import {cellTypesGaur, cellModelParamsGaur} from './cellModels/gaur'
import { GUI } from 'dat.gui';
import $ from 'jquery';

(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

const visualParams = {
    voiMax   : 60,
    voiMin   : -100,
    plot_dt  : 1
}
const gui             = new GUI();

$('#btn-simulate').on('click',()=>{
    const cellModel = gui.__folders.Simulation.__controllers[0].getValue()
    const cellType = gui.__folders.Simulation.__controllers[1].getValue()
    var params;


    // TODO Here we must read from the gui and not the default parameters in case an user has changed them
    // Also the visual params in which we need to have the num of points! and maybe also add the x axis to be ms
    // taking into account numPoints dt and dt_plot

    // Also period is not working if not with the default fentonKarma so I think there's no more connection between
    // gui and buffers when it is not the default I suspeect it might be due to the switching I do here
    if (cellModel == 'Fenton_Karma'){
        if (cellType == 'BR'){
            params = cellModelParamsFKBR;
        }else if (cellType == 'GP'){
            params = cellModelParamsFKGP;
        }else if (cellType == 'MBR'){
            params = cellModelParamsFKMBR;
        }else if (cellType == 'MLR-1'){
            params = cellModelParamsFKMLR1;
        }else{
            throw new Error(`Unknown Cell Type "${cellType}" for "${cellModel}" cell model`)
        }
    }else if (cellModel == 'Gaur'){
        params = cellModelParamsGaur;
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }

    SimCell(gui, cellModel, params.states, params.constants, params.stim, visualParams);
});

function changeCellModel(this: any){
    const newCellModel = this.object.Cell_Model;
    this.__gui.remove(this.__gui.__controllers[1])
    this.__gui.removeFolder(this.__gui.__folders.Constants)
    this.__gui.removeFolder(this.__gui.__folders.Stim)

    var cellTypes
    if (newCellModel == 'Fenton_Karma'){
        cellTypes = cellTypesFK;
    }else if (newCellModel == 'Gaur'){
        cellTypes = cellTypesGaur;
    }else{
        throw new Error(`Unknown Cell Model "${newCellModel}"`)
    }

    var cellModelsType = { Cell_Type: cellTypes[0]}

    this.__gui.getRoot().__folders.Simulation.add(cellModelsType, 'Cell_Type', cellTypes).onChange(changeCellTypes);
    const constantsFolder = this.__gui.getRoot().__folders.Simulation.addFolder('Constants')
    const stimFolder = this.__gui.getRoot().__folders.Simulation.addFolder('Stim')

    var constants : Object;
    var stim : Object;
    if (cellTypes[0] == 'BR'){
        constants = cellModelParamsFKBR.constants;
        stim      = cellModelParamsFKBR.stim;
    }else if (cellTypes[0] == 'GP'){
        constants = cellModelParamsFKGP.constants;
        stim      = cellModelParamsFKBR.stim;
    }else if (cellTypes[0] == 'MBR'){
        constants = cellModelParamsFKMBR.constants;
        stim      = cellModelParamsFKBR.stim;
    }else if (cellTypes[0] == 'MLR-1'){
        constants = cellModelParamsFKMLR1.constants;
        stim      = cellModelParamsFKBR.stim;
    }else if (cellTypes[0] == 'GaurUnique'){
        constants = cellModelParamsGaur.constants;
        stim      = cellModelParamsFKBR.stim;
    }else{
        throw new Error(`Unknown Cell Type "${cellTypes[0]}"`)
    }
    
    
    Object.keys(constants).forEach((k) => {constantsFolder.add(constants, k);});
    Object.keys(stim).forEach((k) => {stimFolder.add(stim, k);});
}


function changeCellTypes(this: any){
    const newCellType = this.object.Cell_Type;
    this.__gui.removeFolder(this.__gui.__folders.Constants)
    const constantsFolder = this.__gui.getRoot().__folders.Simulation.addFolder('Constants')

    var cellParams : Object;
    if (newCellType == 'BR'){
        cellParams = cellModelParamsFKBR.constants;
    }else if (newCellType == 'GP'){
        cellParams = cellModelParamsFKGP.constants;
    }else if (newCellType == 'MBR'){
        cellParams = cellModelParamsFKMBR.constants;
    }else if (newCellType == 'MLR-1'){
        cellParams = cellModelParamsFKMLR1.constants;
    }else if (newCellType == 'GaurUnique'){
        cellParams = cellModelParamsGaur.constants;
    }else{
        throw new Error(`Unknown Cell Type "${newCellType}"`)
    }

    Object.keys(cellParams).forEach((k) => {constantsFolder.add(cellParams, k)});

}

$(document).ready(function(){
    console.log("WE ARE READY!!");


    var cellModelsGui = { Cell_Model: 'Fenton_Karma'}
    var cellModelsType = { Cell_Type: 'BR'}

    //Dat.gui definition
    const visualGUIFolder = gui.addFolder('Visualization');
    const simGUIFolder    = gui.addFolder('Simulation');
    Object.keys(visualParams).forEach((k) => {visualGUIFolder.add(visualParams, k);});
    simGUIFolder.add(cellModelsGui, 'Cell_Model', ['Fenton_Karma','Gaur'] ).onChange(changeCellModel);
    simGUIFolder.add(cellModelsType, 'Cell_Type', ['BR','GP', 'MBR', 'MLR-1'] ).onChange(changeCellTypes);
    const constantsFolder = simGUIFolder.addFolder('Constants');
    const stimFolder = simGUIFolder.addFolder('Stim');
    Object.keys(cellModelParamsFKBR.constants).forEach((k) => {constantsFolder.add(cellModelParamsFKBR.constants, k);});
    Object.keys(cellModelParamsFKBR.stim).forEach((k) => {stimFolder.add(cellModelParamsFKBR.stim, k);});

});