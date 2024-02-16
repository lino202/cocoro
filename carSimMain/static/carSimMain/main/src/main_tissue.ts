import { SimLineMonodomain} from './main_modules/simLineMonodomain';
import { SimSurfMonodomain} from './main_modules/simSurfMonodomain';
import { SimSurfMonodomainParts } from './main_modules/simSurfMonodomainParts';
import { checkWebGPU, meshObj } from './helpers/helper';
import {  initGUI4UniqueCellModel, manageDataFromGUI, cellObj} from './helpers/manageCellModelGUI';
import $ from 'jquery';
import { GUI } from 'dat.gui';
import { Parser } from 'pickleparser'

//  Global Variables ------------
const visualParams = {
    voiMax   : 60,
    voiMin   : -100,
    plot_dt  : 1,     // This should be in ms if dt is in ms
    // num_points : 3000
}
const gui = new GUI();
declare let meshData: meshObj;
declare const path: string;

// Functions -------------------

async function getMeshData() {
    // Here we load the .pickle file with mesh proccesed data 
    // we use the parser https://github.com/ewfian/pickleparser
    // For now chrome is passing the request to http://localhost:8000/media/ without cors or cors-django-headers
    // which is fine for development but there will need to review this if one day we arrive to prod or public availability of the app/webpage
    const fileSelector = document.getElementById('selectMeshOptions') as HTMLSelectElement;
    const meshURL: string = 'http://localhost:8000/media/' + fileSelector.value + '.pickle'
    console.log('Mesh URL:', meshURL);

    const parser = new Parser();
    const response = await fetch(meshURL);
    const data = await response.blob();
    const arrayBuffer = await data.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    var meshData:meshObj = parser.parse(byteArray);

    meshData.vertexs      = new Float32Array(meshData.vertexs)
    meshData.render_elems = new Uint32Array(meshData.render_elems)
    meshData.normals      = new Float32Array(meshData.normals);
    meshData.stim_params  = new Float32Array(meshData.stim_params);
    meshData.connections  = new Uint32Array(meshData.connections);
    meshData.fibers_long  = new Float32Array(meshData.fibers_long);

    return meshData;    

}

// Main ----------------
(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

$(document).ready(function(){
    console.log("WE ARE READY!!");
    initGUI4UniqueCellModel(gui, visualParams, "Tissue");
});

// TODO We need to add 2D and 3D as well as AP plot at least of 1, and EXMs

// TODO we might need to rewrite all in OOP, with this a better handling of gpu limits and required limits in function of the experiments

// TODO We also have to show stim regions on gui and made available the modification of those parameters
// the stimulation buffer is already written (see up)  as it is constant and we use set data

// TODO it seems to work with 360k but 6M nodes is to slow to pass from python to ts, check what can be done!!

// TODO check cell for avoid run-errors and also the Line simulation

// TODO See If we can save some time but not calling that much dispatches works (now are 5)

// TODO for adding FEM search for FEM in the project

// TODO put the name to the buffers and all webgpu instances so when error arose we noe which buffer is

// TODO check that the limits we are requering are ok maybe they are to much

// TODO make SimSurfMonodomainParts mor efficient if we can

// TODO try the 3D setting

// TODO for now the size of the workgroups is constrained by the defaul minimum values we need to go to use the discrete gpu which supports better things
// maybe for this reason this is to slow!!

// TODO add different resolution otherwise we will die as it seems to slow yet

// TODO database is too slow, for now we are going to read a pickle file with the data already preprocess and that is going to be passed to typescript


$('#btn-simulate').on('click', async ()=>{

    // const meshData:meshObj = getDataFromDjango(djangodata);
    const meshData:meshObj = await getMeshData();
    const cellObj:cellObj  = await manageDataFromGUI(gui, "Tissue");

    if (meshData.elementType == "triangle"){
        console.log("Surface Monodomain Simulation")
        // SimSurfMonodomain(gui, meshData, cellObj) 
        SimSurfMonodomainParts(gui, meshData, cellObj) ;
    }else if (meshData.elementType == "line") {
        console.log("Line Monodomain Simulation")
        SimLineMonodomain(gui, meshData, cellObj)
    }
});
