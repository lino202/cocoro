import { CreateSurf} from './main_modules/createShapeSurf';
import { CreateLine} from './main_modules/createShapeLine';
import { SimLineHeat} from './main_modules/simLineHeat';
import { SimSurfHeat} from './main_modules/simSurfHeat';
import { LightInputsInterface } from './helpers/mysettings';
import { checkWebGPU, GetColorFromVertexs, getDataFromDjango } from './helpers/helper';
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
    console.log("Params")
    console.log(djangodata.params)

    // console.log("regQuadFDrelations")
    // console.log(djangodata.regQuadFDrelations)
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
    // let colors = GetColorFromVertexs(meshData.vertexs);
    if (meshData.meshType == "triangle"){
        if ($("#simulator").is(":checked")){
            SimSurfHeat(meshData.vertexs, meshData.normals, meshData.indexs, meshData.voiInitValues, meshData.params)
        }else{
            let colors = GetColorFromVertexs(meshData.vertexs);
            CreateSurf(meshData.vertexs, meshData.normals, meshData.indexs, colors, li);
        }

        
    }else if (meshData.meshType == "line") {
        if ($("#simulator").is(":checked")){
            SimLineHeat(meshData.vertexs, meshData.normals, meshData.indexs, meshData.voiInitValues, meshData.params)
        }else{
            let colors = GetColorFromVertexs(meshData.vertexs);
            CreateLine(meshData.vertexs, meshData.normals, meshData.indexs, colors, li)
        }

    }

});