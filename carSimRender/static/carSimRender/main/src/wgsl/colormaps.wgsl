//VERTEX SHADER ---------------------------------------------------
fn color_map_turbo(x : f32) ->  vec3<f32> {
    const kRedVec4   = vec4<f32>(0.13572138, 4.61539260, -42.66032258, 132.13108234);
    const kGreenVec4 = vec4<f32>(0.09140261, 2.19418839, 4.84296658, -14.18503333);
    const kBlueVec4  = vec4<f32>(0.10667330, 12.64194608, -60.58204836, 110.36276771);
    const kRedVec2   = vec2<f32>(-152.94239396, 59.28637943);
    const kGreenVec2 = vec2<f32>(4.27729857, 2.82956604);
    const kBlueVec2  = vec2<f32>(-89.90310912, 27.34824973);
  
    var x_clamped = clamp(x,0.0,1.0); 
    var v4 = vec4<f32>( 1.0, x_clamped, x_clamped * x_clamped, x_clamped * x_clamped * x_clamped);
    var v2 = v4.zw * v4.z;
    return vec3<f32>(
        dot(v4, kRedVec4)   + dot(v2, kRedVec2),
        dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
        dot(v4, kBlueVec4)  + dot(v2, kBlueVec2)
    );
}

fn color_map_viridis(x : f32) -> vec3<f32> {

    const c0 = vec3<f32>(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);
    const c1 = vec3<f32>(0.1050930431085774, 1.404613529898575, 1.384590162594685);
    const c2 = vec3<f32>(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);
    const c3 = vec3<f32>(-4.634230498983486, -5.799100973351585, -19.33244095627987);
    const c4 = vec3<f32>(6.228269936347081, 14.17993336680509, 56.69055260068105);
    const c5 = vec3<f32>(4.776384997670288, -13.74514537774601, -65.35303263337234);
    const c6 = vec3<f32>(-5.435455855934631, 4.645852612178535, 26.3124352495832);

    return c0+x*(c1+x*(c2+x*(c3+x*(c4+x*(c5+x*c6)))));

}