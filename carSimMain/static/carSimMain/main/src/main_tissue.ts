import { SimLineMonodomain} from './main_modules/simLineMonodomain';
import { SimSurfMonodomain} from './main_modules/simSurfMonodomainAtomics';
// import { SimSurfMonodomain } from './main_modules/simSurfMonodomain';
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

// TODOs in order:
// TODO check cell and line sims for avoid run-errors: Done! cell seems to not be affected so I leave it without
// TODO add different resolutions
// TODO add all cases of BC spatial derivatives in 2D
// TODO add 3D
// TODO add AP plot
// TODO add pECGs
// TODO Rewrite all in OOP (and names and labels to webgpu instances for error handling)
// TODO add FEM (search for FEM in the project)
// TODO add CS
// TODO show stim regions on gui and made available the modification of those parameters



Notes:
// We have two simSurfMonodomain for avoiding run-data errors:
// 1- With Atomics which implies quantization from float to int as atomics operations are only supported by ints. This is just a little bit faster 
// than the second approach but errors due to quatization should be measured even if they not seem important.
// 2- in the other approach we separate the computation with two dispatches one for computing divG_gradV and the other for update V 
// and compute the ionic part, this is just a little bit slower (we call to dispatches) but always we work with floats so no quatization

// The loop for computing several dts and plot with plot_dt seems to not be possible as if we do it inside there is the problem that
// Vms neighbouring to the node of interes are frozen to initial values and this gives distortion (como serrucho). Doing it outside in the draw
// function simple lags the rendering and the improved in overall simulation time is almost null. So unless we manage to do the computation inside
// one compute shader it seems unuseful to have plot_dt and the best option is to plot every dt 

$('#btn-simulate').on('click', async ()=>{

    // const meshData:meshObj = getDataFromDjango(djangodata);
    const meshData:meshObj = await getMeshData();
    const cellObj:cellObj  = await manageDataFromGUI(gui, "Tissue");

    if (meshData.elementType == "triangle"){
        console.log("Surface Monodomain Simulation")
        SimSurfMonodomain(gui, meshData, cellObj);
    }else if (meshData.elementType == "line") {
        console.log("Line Monodomain Simulation")
        SimLineMonodomain(gui, meshData, cellObj)
    }
});
