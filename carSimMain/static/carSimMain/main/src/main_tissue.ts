import { SimLineMonodomain} from './main_modules/simLineMonodomain';
import { SimQuadMonodomain} from './main_modules/SimQuadMonodomain';
import { checkWebGPU, meshObj } from './helpers/helper';
import {  initGUI4UniqueCellModel, manageDataFromGUI, cellObj} from './helpers/manageCellModelGUI';
import $ from 'jquery';
import { GUI } from 'dat.gui';
import { Parser } from 'pickleparser'

//  Global Variables ------------
const visualParams = {
    voiMax   : 60,
    voiMin   : -100,
    plot_dt  : 0.2,     // This should be in ms if dt is in ms
    // num_points : 3000
}

const gpuSettings = {
    workgroup_size   : 64,
}
const gui = new GUI();

// Functions -------------------

async function getMeshData() {
    // Here we load the .pickle file with mesh proccesed data 
    // we use the parser https://github.com/ewfian/pickleparser
    // For now chrome is passing the request to http://localhost:8000/media/ without cors or cors-django-headers
    // which is fine for development but there will need to review this if one day we arrive to prod or public availability of the app/webpage
    // If you are on 127.0.0.1: or similar in the browser you'll get the CORS error
    const fileSelector = document.getElementById('selectMeshOptions') as HTMLSelectElement;
    const meshURL: string = 'http://localhost:8000/media/' + fileSelector.value + '.pickle'
    console.log('Mesh URL:', meshURL);

    const parser = new Parser();
    const response = await fetch(meshURL);
    const data = await response.blob();
    const arrayBuffer = await data.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    var meshData:meshObj = parser.parse(byteArray);

    meshData.vertexs                   = new Float32Array(meshData.vertexs)
    meshData.render_elems              = new Uint32Array(meshData.render_elems)
    meshData.normals                   = new Float32Array(meshData.normals);
    meshData.stim_params               = new Float32Array(meshData.stim_params);
    meshData.connections               = new Uint32Array(meshData.connections);
    meshData.render_points_global_ids  = new Uint32Array(meshData.render_points_global_ids);
    meshData.fibers_long               = new Float32Array(meshData.fibers_long);

    return meshData;    

}

// Main ----------------
(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

$(document).ready(function(){
    console.log("WE ARE READY!!");
    initGUI4UniqueCellModel(gui, gpuSettings, visualParams, "Tissue");
});

// MAIN TODOs in order:
// TODO add 3D
// TODO add different resolutions dx
// TODO add AP plot
// TODO add pECGs
// TODO Rewrite all in OOP (and names and labels to webgpu instances for error handling)
// TODO add FEM (search for FEM in the project) see continuos and discontinous (might be better for GPU) Galerkin methods
// TODO add CS
// TODO show stim regions on gui and made available the modification of those parameters
// TODO stim with click
// see secondary TODOs around in code



// Notes:
// For finite differences we avoided operator splitting as this yielded a more compliant code that could be run in a compute shader
// and reduce/erase the data-run problems due to several threads accesses to the same variable.

// We have a loop for computing several dts inside the compute shaders. The amount of dts to compute before rendering is define by plot_dt
// as compute steps = plot_dt/dt. I think doing this has a problem which is that Vms neighbouring to the node of interest being processed in a thread 
// are frozen to initial values or not updating synchronously and this gives distortion. For example if plot_dt is high as 1 ms, the rendering gets slow 
// (fps drops obviously) and more importantly a distortion in Vms computation appears, saw-tooth in the wavefront, as spatial gradients computation have higher
// error due to unsynchronization of Vms values reading and writing among different threads. 
// We tried doing the plot_dt loop in the draw function (outside the gpu, outside the shader) but it lags the rendering and the improvement 
// in overall simulation time if compared with plot_dt=dt is almost null. 
// Conclusion: The loop in the compute shader should be there otherwise is too slow. For avoiding saw-tooth a treadoff is the only option now -> if we reduce plot_dt 
// to 0.2 the distortion almost completely vanished! Now plot_dt=0.02 you have exact solution but slow, plot_dt=0.2 error unperceptible faster (default), plot_dt=1 faster/fastest but saw-tooth

$('#btn-simulate').on('click', async ()=>{

    // const meshData:meshObj = getDataFromDjango(djangodata);
    const meshData:meshObj = await getMeshData();
    const cellObj:cellObj  = await manageDataFromGUI(gui, "Tissue");

    if (meshData.elementType == "line") {
        console.log("Line Monodomain Simulation")
        SimLineMonodomain(gui, meshData, cellObj)
    }else if (meshData.elementType == "quad"){
        console.log("Quad Monodomain Simulation")
        SimQuadMonodomain(gui, meshData, cellObj);
    }else if (meshData.elementType == "hexa") {
        console.log("Hexa Monodomain Simulation")
        // SimHexaMonodomain(gui, meshData, cellObj)
    }else{
        console.log("Wrong elementType, you need to provide a mesh with line, quad or hexa elements")
    }
});
