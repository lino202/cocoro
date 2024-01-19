import { SimLineMonodomain} from './main_modules/simLineMonodomain';
import { SimSurfMonodomain} from './main_modules/simSurfMonodomain';
import { SimSurfMonodomainParts } from './main_modules/simSurfMonodomainParts';
import { LightInputsInterface } from './helpers/mysettings';
import { checkWebGPU, getDataFromDjango, meshObj } from './helpers/helper';
import {  initGUI4UniqueCellModel, manageDataFromGUI, cellObj} from './helpers/manageCellModelGUI';
import $ from 'jquery';
import { GUI } from 'dat.gui';

//  Global Variables ------------
const visualParams = {
    voiMax   : 60,
    voiMin   : -100,
    plot_dt  : 1,     // This should be in ms if dt is in ms
    // num_points : 3000
}
const gui = new GUI();
declare let djangodata: any;
let li:LightInputsInterface = {};

// Main ----------------
(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

$('#btn-print-mesh-info').on('click',()=>{
    console.log("Vertexs")
    console.log(djangodata.vertexs)
    console.log("Cells / Indexes")
    console.log(djangodata.cells)
    console.log("Normals")
    console.log(djangodata.normals)
    console.log("Init Values of Variable of Interest VoI")
    console.log(djangodata.voiInitValues)
    console.log("Stim Params")
    console.log(djangodata.stim_params)
    console.log("Connections")
    console.log(djangodata.connections)
    console.log("Fibers longitudinal")
    console.log(djangodata.fibers_long)
});

$(document).ready(function(){
    console.log("WE ARE READY!!");
    initGUI4UniqueCellModel(gui, visualParams, "Tissue");
});

// TODO We need to add 2D and 3D as well as AP plot at least of 1, and EXMs

// TODO we might need to rewrite all in OOP

// TODO We also have to show stim regions on gui and made available the modification of those parameters
// the stimulation buffer is already written (see up)  as it is constant and we use set data

// TODO check that chrome is using on chip gpu and not the nvidia dedicated one

// TODO it seems to work with 360k but 6M nodes is to slow to pass from python to ts, check what can be done!!


$('#btn-simulate').on('click',()=>{

    const meshData:meshObj = getDataFromDjango(djangodata);
    const cellObj:cellObj = manageDataFromGUI(gui, "Tissue");

    if (meshData.meshType == "triangle"){
        console.log("Surface Monodomain Simulation")
        // SimSurfMonodomain(gui, meshData, cellObj) 
        SimSurfMonodomainParts(gui, meshData, cellObj) ;
    }else if (meshData.meshType == "line") {
        console.log("Line Monodomain Simulation")
        SimLineMonodomain(gui, meshData, cellObj)
    }
});
