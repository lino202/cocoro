import { CreateSurf} from './main_modules/createShapeSurf';
import { CreateLine} from './main_modules/createShapeLine';
import { LightInputsInterface } from './helpers/mysettings';
import { checkWebGPU, GetColorFromVertexs, getDataFromDjango, meshObj } from './helpers/helper';
import $ from 'jquery';
// import { GUI } from 'dat.gui';


//  Global Variables ------------
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
});

$(document).ready(function(){
    console.log("WE ARE READY!!");
});


$('#btn-render').on('click',()=>{

    const meshData:meshObj = getDataFromDjango(djangodata);

    if (meshData.meshType == "triangle"){
        console.log("Surface Rendering")
        let colors = GetColorFromVertexs(meshData.vertexs);
        CreateSurf(meshData.vertexs, meshData.normals, meshData.indexs, colors, li);
    }else if (meshData.meshType == "line") {
        console.log("Line Rendering")
        let colors = GetColorFromVertexs(meshData.vertexs);
        CreateLine(meshData.vertexs, meshData.normals, meshData.indexs, colors, li)
    }
});
