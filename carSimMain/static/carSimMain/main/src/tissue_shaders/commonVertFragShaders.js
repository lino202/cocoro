import {colormapFunctions} from './colormaps.js'

export const commonVertFragShaders = /*wgsl*/`

    ${colormapFunctions}

    struct VertexUniforms {
        viewProjectionMatrix : mat4x4<f32>,
        modelMatrix : mat4x4<f32>,               
        normalMatrix : mat4x4<f32>,            
    };
    @binding(0) @group(0) var<uniform> vertex_uniforms : VertexUniforms;


    struct Output { // This is different from input buffers in createRenderPipeline
        @builtin(position) Position : vec4<f32>,
        @location(0) vPosition : vec4<f32>,
        @location(1) vNormal : vec4<f32>,
        @location(2) vColor : vec3<f32>,
    };

    @vertex
    fn vs_main (@location(0) position: vec4<f32>, @location(1) normal: vec4<f32>, @location(2) voi: f32) -> Output {    
        var output: Output;            
        let mPosition:vec4<f32> = vertex_uniforms.modelMatrix * position; 
        output.vPosition = mPosition;                  
        output.vNormal =  vertex_uniforms.normalMatrix * normal;
        output.Position = vertex_uniforms.viewProjectionMatrix * mPosition;

        //Get vertex color based on normalized VoI computed in compute shader
        if ((voi <= 1.0) & (voi >= 0.0)){               
            output.vColor = color_map_turbo(voi); 
        }else{
            output.vColor = vec3<f32>(1.,0.,1.); //Plot in magenta out of range, nan or inf
        }
        return output;
    }

    //FRAGMENT SHADER ---------------------------------------------------
    @fragment
    fn fs_main (@location(2) vColor: vec3<f32>) ->  @location(0) vec4<f32> {
        return vec4<f32>(vColor, 1.0);
    }
`;