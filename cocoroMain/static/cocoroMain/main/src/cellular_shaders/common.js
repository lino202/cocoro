export const commonStructs = /*wgsl*/`
  struct Stim {
    period : f32,
    amp: f32,
    dur: f32,
    start: f32
  }

  struct Integration {
    dt : f32,
  }

  struct VisualParams {
    min : f32,
    max : f32,
    plot_dt : f32,
    num_points : i32       
  }

`;


export const commonCellModelDefinitions = /*wgsl*/`
  @binding(0) @group(0) var<storage, read_write> vois : array<f32>;
  @binding(1) @group(0) var<storage, read_write> states : States;
  @binding(2) @group(0) var<uniform> constants : Constants;
  @binding(3) @group(0) var<uniform> stim : Stim;
  @binding(4) @group(0) var<uniform> integ : Integration;
  @binding(5) @group(0) var<uniform> visual_params : VisualParams;
  // @binding(6) @group(0) var<storage, read_write> quantized_vm  : array<atomic<i32>>;
  // @binding(6) @group(0) var<storage, read_write> results : array<f32>;

  // const QUANTIZE_FACTOR = 32768.0;
  // const DEQUANTIZE_FACTOR = 1.0 / 32768.0;
  var<private> current_compute_interval: f32;

`;