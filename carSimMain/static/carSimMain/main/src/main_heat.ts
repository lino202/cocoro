import { SimLineHeat} from './main_modules/simLineHeat';
import { SimSurfHeat} from './main_modules/simSurfHeat';
import { checkWebGPU, getDataFromDjango, meshObj } from './helpers/helper';
import $ from 'jquery';

declare let djangodata: any;

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
    console.log("Params")
    console.log(djangodata.params)

    // console.log("regQuadFDrelations")
    // console.log(djangodata.regQuadFDrelations)
    // const meshData = getDataFromDjango(djangodata);
});

$(document).ready(function(){
    console.log("WE ARE READY!!");
});


//TODO heat is not working well for some reason
// line has been corrected so great but is still in nan
// and surface has to be rearranged for being compliant with line and new approach
// also maybe 3D is possible if we put a newman condition instead of a boundary one
// Correcting Heat is not priority
$('#btn-simulate').on('click',()=>{

    const meshData:meshObj = getDataFromDjango(djangodata);

    if (meshData.meshType == "triangle"){
        console.log("Surface Heat Simulation")
        SimSurfHeat(meshData.vertexs, meshData.normals, meshData.indexs, meshData.voiInitValues, meshData.params)
    }else if (meshData.meshType == "line") {
        console.log("Line Heat Simulation")
        SimLineHeat(meshData.vertexs, meshData.normals, meshData.indexs, meshData.voiInitValues, meshData.params)
    }
});
