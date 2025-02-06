import {cellTypesFK, cellModelParamsFKBR, cellModelParamsFKMBR, cellModelParamsFKGP, cellModelParamsFKMLR1} from '../cellular_definitions/fenton_karma_init'
import {cellTypesGaur, cellModelParamsGaur} from '../cellular_definitions/gaur_init'
import { GUI } from 'dat.gui';
import { debugSettingsObj, saveSettingsObj } from './helper';

export interface cellObj {
    cellModel: string,
    states: Record<string,number>,
    constants: Record<string,number>,
    stim: Record<string,number>
}


function changeCellModel(newCellModel:string, gui: GUI, simScale:string="Cellular",): void {
    gui.__folders.IonicParams.remove(gui.__folders.IonicParams.__controllers[1])
    gui.__folders.IonicParams.removeFolder(gui.__folders.IonicParams.__folders.Constants)
    if (simScale == "Cellular"){gui.__folders.IonicParams.removeFolder(gui.__folders.IonicParams.__folders.Stim)}


    var cellTypes
    if (newCellModel == 'Fenton_Karma'){
        cellTypes = cellTypesFK;
    }else if (newCellModel == 'Gaur'){
        cellTypes = cellTypesGaur;
    }else{
        throw new Error(`Unknown Cell Model "${newCellModel}"`)
    }

    var cellModelsType = { Cell_Type: cellTypes[0]}

    gui.__folders.IonicParams.add(cellModelsType, 'Cell_Type', cellTypes).onChange(function(newValue){
        changeCellTypes(newValue, gui, simScale);
    });
    const constantsFolder = gui.__folders.IonicParams.addFolder('Constants')
    if (simScale == "Cellular"){var stimFolder:GUI = gui.__folders.IonicParams.addFolder('Stim')}

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
    if (simScale == "Cellular"){Object.keys(stim).forEach((k) => {stimFolder.add(stim, k);});}
}


function changeCellTypes(newCellType:string, gui:GUI, simScale:string = "Cellular"): void {
    gui.__folders.IonicParams.removeFolder(gui.__folders.IonicParams.__folders.Constants)
    const constantsFolder = gui.__folders.IonicParams.addFolder('Constants')
    if (simScale == "Cellular"){
        gui.__folders.IonicParams.removeFolder(gui.__folders.IonicParams.__folders.Stim);
        var stimFolder:GUI = gui.__folders.IonicParams.addFolder('Stim');
    }

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
    if (simScale == "Cellular"){Object.keys(cellParamsStims).forEach((k) => {stimFolder.add(cellParamsStims, k)});}

}

export function initGUI4UniqueCellModel(gui:GUI, gpuSettings:Record<string,number>, visualParams:Record<string,number>, simScale:string="Cellular", saveSettings:saveSettingsObj, debugSettings:debugSettingsObj): void {
    var cellModelsGui = { Cell_Model: 'Fenton_Karma'}
    var cellModelsType = { Cell_Type: 'BR'}

    //Dat.gui definition
    const gpuSettingsGUIFolder = gui.addFolder('gpuSettings');
    const simGUIFolder         = gui.addFolder('IonicParams');

    Object.keys(gpuSettings).forEach((k) => {gpuSettingsGUIFolder.add(gpuSettings, k);});
    simGUIFolder.add(cellModelsGui, 'Cell_Model', ['Fenton_Karma','Gaur'] ).onChange(function(newValue){
        changeCellModel(newValue, gui, simScale);
    });
    simGUIFolder.add(cellModelsType, 'Cell_Type', ['BR','GP', 'MBR', 'MLR-1'] ).onChange(function(newValue){
        changeCellTypes(newValue, gui, simScale);
    });
    const constantsFolder = simGUIFolder.addFolder('Constants');
    Object.keys(cellModelParamsFKBR.constants).forEach((k) => {constantsFolder.add(cellModelParamsFKBR.constants, k);});

    const visualGUIFolder      = gui.addFolder('Visualization');
    if (simScale == "Cellular"){
        var stimFolder:GUI = simGUIFolder.addFolder('Stim');
        Object.keys(cellModelParamsFKBR.stim).forEach((k) => {stimFolder.add(cellModelParamsFKBR.stim, k);});

        // Stupid thing having state variable to be selected in the plot of cell sim
        // because visualParams do not admit string:string as the code is done now
        // we need to change this when we make the code OOP
        var visualParamsWithVarName = { ...visualParams, var_name: 'vm' }
        Object.keys(visualParamsWithVarName).forEach((k) => {visualGUIFolder.add(visualParamsWithVarName, k);});
    }else{
        Object.keys(visualParams).forEach((k) => {visualGUIFolder.add(visualParams, k);});

    }

    const saveGUIFolder = gui.addFolder('Save');
    const debugGUIFolder = gui.addFolder('Debug');
    Object.keys(saveSettings).forEach((k) => {saveGUIFolder.add(saveSettings, k);});
    Object.keys(debugSettings).forEach((k) => {debugGUIFolder.add(debugSettings, k);});

}


export function manageDataFromGUI(gui: GUI, simScale:string="Cellular"): cellObj{
    var cellModelController = gui.__folders.IonicParams.__controllers[0];
    var cellTypeController  = gui.__folders.IonicParams.__controllers[1];
    const cellModel         = cellModelController.getValue();
    const cellType          = cellTypeController.getValue();

    var params;

    // Disable things (visualization and cell model name and type)
    const visControllers = gui.__folders.Visualization.__controllers;
    for (let i=0; i<visControllers.length; i++){
        if ((visControllers[i].property != 'min') && (visControllers[i].property != 'max')){
            var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = visControllers[i].domElement.querySelector('input');
            if (controllerDomElement != null){
                controllerDomElement.disabled = true;
            }
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
    const saveControllers = gui.__folders.Save.__controllers;
    for (let i=0; i<saveControllers.length; i++){
        var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = saveControllers[i].domElement.querySelector('input');
        if (controllerDomElement != null){
            controllerDomElement.disabled = true;
        }
    }
    const debugControllers = gui.__folders.Debug.__controllers;
    for (let i=0; i<debugControllers.length; i++){
        var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = debugControllers[i].domElement.querySelector('input');
        if (controllerDomElement != null){
            controllerDomElement.disabled = true;
        }
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

    // Here stim has to be passed otherwise cellular side gives problems as stim seems to have the possibility to be undefined
    // solve with OOP
    return {cellModel: cellModel, states : params.states, constants: params.constants, stim: params.stim}

}




export function blockGraphsGuiParams(guiCellVarGraph: GUI, guiPECGGraph: GUI){

    // Disable things
    // Disable varName
    var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = guiCellVarGraph.__folders.Visualization.__controllers[3].domElement.querySelector('input');
    if (controllerDomElement != null){
        controllerDomElement.disabled = true;
    }
    // disable num_points
    var controllerDomElement: HTMLInputElement | HTMLSelectElement |  null = guiCellVarGraph.__folders.Visualization.__controllers[4].domElement.querySelector('input');
    if (controllerDomElement != null){
        controllerDomElement.disabled = true;
    }
    


}