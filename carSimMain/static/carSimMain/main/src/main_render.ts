import { CreateSurf} from './main_modules/createShapeSurf';
import { CreateLine} from './main_modules/createShapeLine';
import { LightInputsInterface } from './helpers/mysettings';
import { checkWebGPU, GetColorFromVertexs, meshObj } from './helpers/helper';
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


// TODO we need to re check the render and make the .html we can here show the nodetags 
//  for example the stim_mags durs o lo que sea o si ponemos nodetags for imps like in opencarp or electra

// $('#btn-render').on('click',()=>{

//     const meshData:meshObj = getDataFromDjango(djangodata);

//     if (meshData.elementType == "triangle"){
//         console.log("Surface Rendering")
//         let colors = GetColorFromVertexs(meshData.vertexs);
//         CreateSurf(meshData.vertexs, meshData.normals, meshData.render_elems, colors, li);
//     }else if (meshData.elementType == "line") {
//         console.log("Line Rendering")
//         let colors = GetColorFromVertexs(meshData.vertexs);
//         CreateLine(meshData.vertexs, meshData.normals, meshData.render_elems, colors, li)
//     }
// });
