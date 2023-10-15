// TODO This code is used only for showing shapes as for the course by Dr. Xi
// it might be delete soon
// vertex shader
struct VertexUniforms {
    viewProjectionMatrix : mat4x4<f32>,
    modelMatrix : mat4x4<f32>,               
    normalMatrix : mat4x4<f32>,            
};
@binding(0) @group(0) var<uniform> vertex_uniforms : VertexUniforms;

struct Output {
    @builtin(position) Position : vec4<f32>,
    @location(0) vPosition : vec4<f32>,
    @location(1) vNormal : vec4<f32>,
    @location(2) vColor : vec3<f32>,
};

@vertex
fn vs_main (@location(0) position: vec4<f32>, @location(1) normal: vec4<f32>, @location(2) color: vec3<f32>) -> Output {    
    var output: Output;            
    let mPosition:vec4<f32> = vertex_uniforms.modelMatrix * position; 
    output.vPosition = mPosition;                  
    output.vNormal =  vertex_uniforms.normalMatrix*normal;
    output.Position = vertex_uniforms.viewProjectionMatrix * mPosition;               
    output.vColor = color;
    return output;
}

// fragment shader
struct FragUniforms {
    lightPosition : vec4<f32>,   
    eyePosition : vec4<f32>,
};
@binding(1) @group(0) var<uniform> frag_uniforms : FragUniforms;


struct ColorUniforms{
    lightColor : vec4<f32>,     //f32 son 4 bytes asignados a cada elemento
    specularColor : vec4<f32>,
};
@binding(2) @group(0) var <uniform> color_uniforms : ColorUniforms;


struct LightUniforms{
    ambientIntensity : f32,
    diffuseIntensity : f32,
    specularIntensity : f32,
    shininess : f32,
    twoSide : f32,
};
@binding(3) @group(0) var <uniform> light_uniforms : LightUniforms;


@fragment
fn fs_main (@location(0) vPosition: vec4<f32>, @location(1) vNormal: vec4<f32>, @location(2) vColor: vec3<f32>) ->  @location(0) vec4<f32> {
    let N:vec3<f32> = normalize(vNormal.xyz);                
    let L:vec3<f32> = normalize(frag_uniforms.lightPosition.xyz - vPosition.xyz);     
    let V:vec3<f32> = normalize(frag_uniforms.eyePosition.xyz - vPosition.xyz);          
    let H:vec3<f32> = normalize(L + V);
    let diffuse:f32 = light_uniforms.diffuseIntensity * max(dot(N, L), 0.0);
    var specular:f32;
    specular = light_uniforms.specularIntensity * pow(max(dot(N, H),0.0), light_uniforms.shininess);
    if(light_uniforms.twoSide == 1.0){   specular = specular + light_uniforms.specularIntensity * pow(max(dot(-N, H),0.0), light_uniforms.shininess);  }
    let ambient:f32 = light_uniforms.ambientIntensity;               
    let finalColor:vec3<f32> = vColor*(ambient + diffuse) + color_uniforms.specularColor.xyz*specular; 
    return vec4<f32>(finalColor, 1.0);
}