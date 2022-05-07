import { CreateSurf} from './createShapeSurf';
import { CreateLine} from './createShapeLine';
import { LightInputs } from './mysettings';
import { checkWebGPU, GetColorFromVertexs, getDataFromDjango } from './helper';
import $ from 'jquery';

declare let djangodata: any;
let li:LightInputs = {};
let gpu: any;

(async () =>{
    const checkGPU = checkWebGPU();
    $("#id-gpu-check").html(checkGPU);
    // gpu = await initGPU();
    // console.log(gpu);
})();

// $('#btn-uploadMesh').on('click',()=>{
//     const meshData = getDataFromDjango(djangodata);
//     let colors = GetColorFromVertexs(meshData.vertexs);
//     CreateSurf(gpu, meshData.vertexs, meshData.normals, meshData.indexs, colors, li);

// });


$('#btn-printvc').on('click',()=>{
    console.log("Vertexs and Cells")
    console.log(djangodata.vertexs)
    console.log(djangodata.cells)
    console.log(djangodata.normals)
    const meshData = getDataFromDjango(djangodata);
    let colors = GetColorFromVertexs(meshData.vertexs);
    console.log(colors);

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
    }else{
        CreateLine(meshData.vertexs, meshData.normals, meshData.indexs, colors, li)
    }

});

// $('#btn-redraw').on('click', function(){
//     li.color = $('#id-color').val()?.toString();
//     li.ambientIntensity = $('#id-ambient').val()?.toString();
//     li.diffuseIntensity = $('#id-diffuse').val()?.toString();
//     li.specularIntensity= $('#id-specular').val()?.toString();
//     li.shininess= $('#id-shininess').val()?.toString()!;
//     li.specularColor = $('#id-scolor').val()?.toString();
//     CreateShapeWithLight(djangodata.positions, djangodata.normals, li, isAnimation);
// });