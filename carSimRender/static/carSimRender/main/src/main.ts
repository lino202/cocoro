import { CreateShapeWithLight, LightInputs } from './createShape';
import { checkWebGPU } from './helper';
import $ from 'jquery';

declare let djangodata: any;
let li:LightInputs = {};

const checkGPU = checkWebGPU();
$("#id-gpu-check").html(checkGPU);

$('#btn-printvc').on('click',()=>{
    console.log("Vertexs and Cells")
    console.log(djangodata.vertexs)
    console.log(djangodata.cells)
    console.log(djangodata.normals)
});

$('#btn-change-color').on('click', ()=>{
    li.color = $('#id-color').val() as string;
    CreateShapeWithLight(djangodata, li);
});


$(document).ready(function(){
    CreateShapeWithLight(djangodata, li);
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