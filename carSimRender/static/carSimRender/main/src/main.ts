import { CreateSurf} from './createShapeSurf';
import { CreateLine} from './createShapeLine';
import { SimLine} from './simLine';
import { LightInputsInterface } from './mysettings';
import { checkWebGPU, GetColorFromVertexs, getDataFromDjango } from './helper';
import $ from 'jquery';

declare let djangodata: any;
let li:LightInputsInterface = {};

(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
})();

// $('#btn-uploadMesh').on('click',()=>{
//     const meshData = getDataFromDjango(djangodata);
//     let colors = GetColorFromVertexs(meshData.vertexs);
//     CreateSurf(gpu, meshData.vertexs, meshData.normals, meshData.indexs, colors, li);

// });


$('#btn-printvc').on('click',()=>{
    console.log("Vertexs")
    console.log(djangodata.vertexs)
    console.log("Cells / Indexes")
    console.log(djangodata.cells)
    console.log("Normals")
    console.log(djangodata.normals)
    console.log("Init Values of Variable of Interest VoI")
    console.log(djangodata.voiInitValues)
    console.log("Stim Params")
    console.log(djangodata.stimParams)
    // const meshData = getDataFromDjango(djangodata);
});


// $('#btn-change-color').on('click', ()=>{
//     li.color = $('#id-color').val() as string;
//     const meshData = getDataFromDjango(djangodata);
//     let colors = GetColorFromVertexs(meshData.vertexs);
//     CreateSurf(meshData.vertexs, meshData.normals, meshData.indexs, colors, li);
// });


$(document).ready(function(){
    
    const meshData = getDataFromDjango(djangodata);
    let colors = GetColorFromVertexs(meshData.vertexs);
    if (meshData.meshType == "triangle"){
        CreateSurf(meshData.vertexs, meshData.normals, meshData.indexs, colors, li);
    }else if (meshData.meshType == "line") {
        // CreateLine(meshData.vertexs, meshData.normals, meshData.indexs, colors, li)
        SimLine(meshData.vertexs, meshData.normals, meshData.indexs, meshData.voiInitValues, meshData.stimParams)
    }

});