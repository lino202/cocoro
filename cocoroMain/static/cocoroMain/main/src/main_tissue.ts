import { SimLineMonodomain } from './main_modules/simLineMonodomain';
import { SimQuadMonodomain} from './main_modules/simQuadMonodomain';
import { SimHexaMonodomain} from './main_modules/simHexaMonodomain';
import { checkWebGPU, meshObj, electrodesObj } from './helpers/helper';
import { LightInputsInterface } from './helpers/mysettings';
import { initGUI4UniqueCellModel, manageDataFromGUI, cellObj, blockGraphsGuiParams} from './helpers/manageCellModelGUI';
import $ from 'jquery';
import { GUI } from 'dat.gui';
import { Parser } from 'pickleparser';
import EnsightWriter from './io/ensightWriter';

//  Global Variables ------------
let li:LightInputsInterface = {};

const visualParams = {
    min   : -100,
    max   : 60,
    plot_dt  : 0.2,     // This should be in ms if dt is in ms
    // num_points : 3000
}

const gpuSettings = {
    workgroup_size   : 64,
}

const saveSettings = {
    start   : -1,
    end   : -1,
    save_name: 'tissue_sim'
}

const debugSettings = {
    start   : -1,
    end   : -1,
    state_name : 'vm',
}

// GUIS
const gui = new GUI();

// CellVar
var checkbox = document.getElementById('cell_var_checkbox') as HTMLInputElement;
checkbox.addEventListener('click', () => {toggleGraphs('cell_var');});
const guiCellVarGraph = new GUI({ autoPlace: false });
const guiCellVarGraphContainer = document.getElementById('cell_var_gui') as HTMLDivElement;
guiCellVarGraphContainer.appendChild(guiCellVarGraph.domElement);

const cellVarVisualizationFolder = guiCellVarGraph.addFolder('Visualization');
const paramsCellVar = {
    min: -100,
    max: 60,
    node_idx: 0,
    var_name: 'vm',
    num_points: 2000
};
cellVarVisualizationFolder.add(paramsCellVar, 'min');
cellVarVisualizationFolder.add(paramsCellVar, 'max');
cellVarVisualizationFolder.add(paramsCellVar, 'node_idx');
cellVarVisualizationFolder.add(paramsCellVar, 'var_name');
cellVarVisualizationFolder.add(paramsCellVar, 'num_points');
cellVarVisualizationFolder.close();

// pECG
checkbox = document.getElementById('pECG_checkbox') as HTMLInputElement;
checkbox.addEventListener('click', () => {toggleGraphs('pECG');});
const guiPECGGraph = new GUI({ autoPlace: false });
const guiPECGGraphContainer = document.getElementById('pECG_gui') as HTMLDivElement;
guiPECGGraphContainer.appendChild(guiPECGGraph.domElement);

const pECGVisualizationFolder = guiPECGGraph.addFolder('Visualization');
const paramsPECG = {
    min: -1,
    max: 1,
    num_points: 2000,
    alpha_smoothing: 0.6
};
pECGVisualizationFolder.add(paramsPECG, 'min');
pECGVisualizationFolder.add(paramsPECG, 'max');
pECGVisualizationFolder.add(paramsPECG, 'num_points');
pECGVisualizationFolder.add(paramsPECG, 'alpha_smoothing', 0, 1);
pECGVisualizationFolder.close();

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
    meshData.actual_points             = new Float32Array(meshData.actual_points)
    meshData.actual_elems              = new Uint32Array(meshData.actual_elems)
    meshData.render_elems              = new Uint32Array(meshData.render_elems)
    meshData.normals                   = new Float32Array(meshData.normals);
    meshData.stim_params               = new Float32Array(meshData.stim_params);
    meshData.connections               = new Uint32Array(meshData.connections);
    meshData.render_points_global_ids  = new Uint32Array(meshData.render_points_global_ids);
    meshData.fibers_long               = new Float32Array(meshData.fibers_long);

    return meshData;    

}


async function getElectrodesData() {
    // Here we load the .pickle file with mesh proccesed data 
    // we use the parser https://github.com/ewfian/pickleparser
    // For now chrome is passing the request to http://localhost:8000/media/ without cors or cors-django-headers
    // which is fine for development but there will need to review this if one day we arrive to prod or public availability of the app/webpage
    // If you are on 127.0.0.1: or similar in the browser you'll get the CORS error
    const fileSelector = document.getElementById('selectElectrodesOptions') as HTMLSelectElement;
    const electrodesURL: string = 'http://localhost:8000/media/' + fileSelector.value + '.pickle'
    console.log('Electrodes URL:', electrodesURL);

    const parser = new Parser();
    const response = await fetch(electrodesURL);
    const data = await response.blob();
    const arrayBuffer = await data.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    var electrodesData:electrodesObj = parser.parse(byteArray);

    // TODO what happens if there is no option 
    electrodesData.actual_points = new Float32Array(electrodesData.actual_points)

    return electrodesData;    

}

function toggleGraphs(Id: string) {
    const canvas = document.getElementById(Id + '_canvas') as HTMLCanvasElement;
    const checkbox = document.getElementById(Id + '_checkbox') as HTMLInputElement;
    const guiContainer = document.getElementById(Id + '_gui') as HTMLDivElement;

    // Change canvas visibility
    canvas.style.display = checkbox.checked ? 'block' : 'none';

    // Initiallize change gui visibility
    if (checkbox.checked) {
        guiContainer.style.display = 'block';
    } else {
        guiContainer.style.display = 'none';
    }
}

// Main ----------------
(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

$(document).ready(function(){
    console.log("WE ARE READY!!");
    initGUI4UniqueCellModel(gui, gpuSettings, visualParams, "Tissue", saveSettings, debugSettings);
});

// MAIN TODOs in order:
// Make three pages one is done is the simple canvas, another with two canvas where you can put or the pECG or the AP plot and another with 3 canvas for the three options sim, AP y pECG
// Calculate things on the gpu specially for the relations for cumputing the FD as this speeds up things and make the .pickle to save and load smaller
// TODO RangeError: Invalid Array Length for the huge mesh, maybe is due to big amount of numbers in the arrays, that's indeed the reason with a hex mesh of 1.3M it works!
// TODO stim params should be define as node sets to reduce array lengths, now uses nNodesx4
// TODO check implementations of double derivatives specially cross ones with neumann condition
// TODO add AP plot
// TODO add pECGs
// TODO Rewrite all in OOP (and names and labels to webgpu instances for error handling) THIS SHOULD BE DONE SLOWLY AS WEE ADD NEW TODOS
// TODO add FEM (search for FEM in the project) see continuos and discontinous (might be better for GPU) Galerkin methods, checked far field form Niccolo and Fenton (there is a new paper from kabodian-fenton where they use the ghost node in the boundary as we do)
// TODO add CS
// TODO show stim regions on gui and made available the modification of those parameters
// TODO stim with click
// TODO Is strange but for the FentonKarma model we get extra negative (under MDP) Vm in the extremes
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

    // The first thing we do is to ask for the user to select a folder to save the ensight files in case save is activated
    // This is done here because we need the user permission (gesture) for writting in the user's filesystem from the browser!
    // and when huge amount of data is being parsed and passed to the sim**Monodomain functions, the window mightbe be unresponsive
    //  leading to the user not being able to select the folder => the this.folderHandler is not defined => error  
    var saveStart = gui.__folders.Save.__controllers[0].getValue();
    var saveName = gui.__folders.Save.__controllers[2].getValue();
    let ensightWriter:EnsightWriter | undefined;
    if (saveStart >= 0){
        ensightWriter = await EnsightWriter.create(saveName + '_geometry.geo', saveName + '_animation.case', saveName + '_state');
    }

    const meshData:meshObj             = await getMeshData();
    const electrodesData:electrodesObj = await getElectrodesData();
    const cellObj:cellObj              = await manageDataFromGUI(gui, "Tissue");
    blockGraphsGuiParams(guiCellVarGraph, guiPECGGraph);

    // TODO? This might be something like in for the fraphs without the canvas for setting mouse stim params before launching the simulation
    const isMouseStimChecked = (document.getElementById('mouse_stim_checkbox') as HTMLInputElement).checked;

    if (meshData.elementType == "line") {
        console.log("Line Monodomain Simulation")
        SimLineMonodomain(gui, meshData, electrodesData, cellObj, ensightWriter, guiCellVarGraph, guiPECGGraph, isMouseStimChecked);
    }else if (meshData.elementType == "quad"){
        console.log("Quad Monodomain Simulation")
        SimQuadMonodomain(gui, meshData, electrodesData, cellObj, ensightWriter, guiCellVarGraph, guiPECGGraph, isMouseStimChecked);
    }else if (meshData.elementType == "hexa") {
        console.log("Hexa Monodomain Simulation")
        SimHexaMonodomain(gui, meshData, electrodesData, cellObj, li, ensightWriter, guiCellVarGraph, guiPECGGraph, isMouseStimChecked);
    }else{
        console.log("Wrong elementType, you need to provide a mesh with line, quad or hexa elements")
    }
});
