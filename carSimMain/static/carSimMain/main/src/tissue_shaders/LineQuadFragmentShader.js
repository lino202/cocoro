export function LineQuadFragmentShader() {

    return /*wgsl*/`

        //FRAGMENT SHADER ---------------------------------------------------
        @fragment
        fn fs_main (@location(2) vColor: vec3<f32>) ->  @location(0) vec4<f32> {
            return vec4<f32>(vColor, 1.0);
        }
    `;
}