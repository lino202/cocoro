import {colormapFunctions} from './colormaps.js'
import {HexaFragmentShader} from './HexaFragmentShader.js'
import {LineQuadFragmentShader} from './LineQuadFragmentShader.js'

export function commonVertFragShaders(elemType) {

    var fragmentShader;

    if (elemType == 'hexa'){
        // The fragment shader needs to have light definitions
        fragmentShader = HexaFragmentShader();
    }else{
        fragmentShader = LineQuadFragmentShader();
    }
    
    return /*wgsl*/`

        ${colormapFunctions}

        struct VertexUniforms {
            viewProjectionMatrix : mat4x4<f32>,       
        };

        struct VisualParams {
            min : f32,
            max : f32,   
        };

        @binding(0) @group(0) var<uniform> vertex_uniforms : VertexUniforms;
        @binding(1) @group(0) var<uniform> visual_params : VisualParams;

        struct Output { // This is different from input buffers in createRenderPipeline
            @builtin(position) Position : vec4<f32>,
            @location(0) vPosition      : vec4<f32>,
            @location(1) vNormal        : vec4<f32>,
            @location(2) vColor         : vec3<f32>,
        };

        @vertex
        fn vs_main (@location(0) position: vec4<f32>, @location(1) normal: vec4<f32>, @location(2) vm: f32) -> Output {    
            var output: Output;            
            // vNormal and vPosition are only passed to the fragment shader of Hexa for line or quad these are irrelevant
            output.vPosition = position;                  
            output.vNormal   = normal;
            output.Position = vertex_uniforms.viewProjectionMatrix * position;

            // Convert to user selected range the vm value obtained form the compute shader
            var norm_vm:f32 = (vm - visual_params.min) / (visual_params.max - visual_params.min);

            //Get vertex color based on normalized vm
            if ((norm_vm <= 1.0) & (norm_vm >= 0.0)){               
                output.vColor = color_map_turbo(norm_vm); 
            }else{
                output.vColor = vec3<f32>(1.,0.,1.); //Plot in magenta out of range, nan or inf
            }
            return output;
        }

        //FRAGMENT SHADER ---------------------------------------------------
        ${fragmentShader}
    `;
}