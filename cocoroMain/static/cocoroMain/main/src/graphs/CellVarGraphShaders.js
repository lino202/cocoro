import { fentonKarmaDefinitions } from '../cellular_shaders/fenton_karma_wgsl'
import { gaurDefinitions} from '../cellular_shaders/gaur_wgsl'


export function renderCellVarGraphComputeShader(cellModel, nNodes, nVertexs, varName, workgroup_size=64){

    // This is necessary as the shifting in the array with the values of the variable of interes VoI needs to write
    // vois[idx] = vois[idx+1] and you cannot write on the vertex shader for saving the values for the next iteration
    var specificDefinitions;
    if (cellModel == 'Fenton_Karma'){
        specificDefinitions = fentonKarmaDefinitions;
    }else if (cellModel == 'Gaur'){
        specificDefinitions = gaurDefinitions;
    }else{
        throw new Error(`Unknown Cell Model "${cellModel}"`)
    }

    return /*wgsl*/`
        
        ${specificDefinitions}

        struct VisualParams {
            voi_min : f32,
            voi_max : f32       
        };

        @binding(0) @group(0) var<storage, read_write> vois : array<f32>; //nVertexs here gives error with function ArrayLength -> it produces no constructor match
        @binding(1) @group(0) var<storage, read> states : array<States, ${nNodes}>;
        @binding(2) @group(0) var<storage, read> visualization : VisualParams;
        @binding(3) @group(0) var<storage, read> node_idx : u32;

        @compute @workgroup_size(${workgroup_size})
        fn comp_main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>) {
            
            //Check for overcomputing and simulation stop
            let idx = GlobalInvocationID.x; 
            if((idx >= arrayLength(&vois))) {return;}

            // Vois not in the right tip of the line should just switch the value
            if (idx <= (arrayLength(&vois)-2)) {
                vois[idx] = vois[idx+1];
                return;    
            }
            
            // Pass to vois and normalize to plot
            if (vois[idx] < 3.40282346638528859812e+38f){ //Check for overflow, nan or inf positive oder negative
                vois[idx] = ((states[node_idx].${varName} - visualization.voi_min) / (visualization.voi_max - visualization.voi_min)) * 2 - 1;
            }else{
                vois[idx] = 1.0; //Plot a line in the top if this overflows
            }
        }
        
    `;

} 

export const renderCellVarGraphVertexShader = /*wgsl*/`
    struct Output {
        @builtin(position) Position : vec4<f32>
    };

    @vertex
    fn vs_main (@location(0) x_coordinate: f32, @location(1) voi: f32) -> Output {    
        var output: Output;            
        output.Position = vec4<f32>(x_coordinate, voi, 0.0, 1.0);
        return output;
    }
`;


export const renderCellVarGraphFragmentShader = /*wgsl*/`
    @fragment
    fn fs_main ()  ->  @location(0) vec4<f32> {
        return vec4(1.0, 0.0, 0.0, 1.0);
    }
`;