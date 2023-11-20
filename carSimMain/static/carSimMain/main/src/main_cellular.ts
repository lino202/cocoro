

import { checkWebGPU } from './helpers/helper';
import { SimCell } from './main_modules/simCell';
import {cellTypesFK, cellModelParamsFKBR, cellModelParamsFKMBR, cellModelParamsFKGP, cellModelParamsFKMLR1} from './cellModels/fenton_karma_init'
import {cellTypesGaur, cellModelParamsGaur} from './cellModels/gaur_init'
import { GUI } from 'dat.gui';
import $ from 'jquery';

(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

const visualParams = {
    voiMax   : 60,
    voiMin   : -100,
    plot_dt  : 1,     // This should be in ms if dt is in ms
    num_points : 3000
}
const gui = new GUI();

$('#btn-simulate').on('click',()=>{
    var cellModelController = gui.__folders.Simulation.__controllers[0];
    var cellTypeController  = gui.__folders.Simulation.__controllers[1];
    const cellModel         = cellModelController.getValue();
    const cellType          = cellTypeController.getValue();
    var params;

    // Disable things (visualization and cell model name and type)
    const visControllers = gui.__folders.Visualization.__controllers;
    for (let i=0; i<visControllers.length; i++){
        var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = visControllers[i].domElement.querySelector('input');
        if (controllerDomElement != null){
            controllerDomElement.disabled = true;
        }
    }
    var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = cellModelController.domElement.querySelector('select');
    if (controllerDomElement != null){
        controllerDomElement.disabled = true;
    }
    var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = cellTypeController.domElement.querySelector('select');
    if (controllerDomElement != null){
        controllerDomElement.disabled = true;
    }


    // Load the params from cell model and type
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
        stim      = cellModelParamsFKGP.stim;
    }else if (cellTypes[0] == 'MBR'){
        constants = cellModelParamsFKMBR.constants;
        stim      = cellModelParamsFKMBR.stim;
    }else if (cellTypes[0] == 'MLR-1'){
        constants = cellModelParamsFKMLR1.constants;
        stim      = cellModelParamsFKMLR1.stim;
    }else if (cellTypes[0] == 'GaurUnique'){
        constants = cellModelParamsGaur.constants;
        stim      = cellModelParamsGaur.stim;
    }else{
        throw new Error(`Unknown Cell Type "${cellTypes[0]}"`)
    }
    
    
    Object.keys(constants).forEach((k) => {constantsFolder.add(constants, k);});
    Object.keys(stim).forEach((k) => {stimFolder.add(stim, k);});
}


function changeCellTypes(this: any){
    const newCellType = this.object.Cell_Type;
    this.__gui.removeFolder(this.__gui.__folders.Constants)
    this.__gui.removeFolder(this.__gui.__folders.Stim)
    const constantsFolder = this.__gui.getRoot().__folders.Simulation.addFolder('Constants')
    const stimFolder = this.__gui.getRoot().__folders.Simulation.addFolder('Stim')

    var cellParamsConsts : Object;
    var cellParamsStims  : Object;
    if (newCellType == 'BR'){
        cellParamsConsts = cellModelParamsFKBR.constants;
        cellParamsStims = cellModelParamsFKBR.stim;
    }else if (newCellType == 'GP'){
        cellParamsConsts = cellModelParamsFKGP.constants;
        cellParamsStims = cellModelParamsFKGP.stim;
    }else if (newCellType == 'MBR'){
        cellParamsConsts = cellModelParamsFKMBR.constants;
        cellParamsStims = cellModelParamsFKMBR.stim;
    }else if (newCellType == 'MLR-1'){
        cellParamsConsts = cellModelParamsFKMLR1.constants;
        cellParamsStims = cellModelParamsFKMLR1.stim;
    }else if (newCellType == 'GaurUnique'){
        cellParamsConsts = cellModelParamsGaur.constants;
        cellParamsStims = cellModelParamsGaur.stim;
    }else{
        throw new Error(`Unknown Cell Type "${newCellType}"`)
    }

    Object.keys(cellParamsConsts).forEach((k) => {constantsFolder.add(cellParamsConsts, k)});
    Object.keys(cellParamsStims).forEach((k) => {stimFolder.add(cellParamsStims, k)});

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