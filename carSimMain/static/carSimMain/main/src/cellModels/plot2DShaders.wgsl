struct Output {
    @builtin(position) Position : vec4<f32>
};

@vertex
fn vs_main (@location(0) coordinates: vec2<f32>, @location(1) voi: f32) -> Output {    
    var output: Output;            
    output.Position = vec4<f32>(coordinates[0], voi, 0.0, 1.0);
    return output;
}

//FRAGMENT SHADER ---------------------------------------------------
@fragment
fn fs_main ()  ->  @location(0) vec4<f32> {
    return vec4(1.0, 0.0, 0.0, 1.0);
}