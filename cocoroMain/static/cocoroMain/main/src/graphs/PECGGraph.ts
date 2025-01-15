



class PECGGraph {


//     constructor(device: GPUDevice, textureFormat: GPUTextureFormat, canvases: Array<HTMLCanvasElement>) {
//         this.device = device;
//         this.textureFormat = textureFormat;
//         this.canvases = canvases;

//         if (this.canvases.length > 0){
//             this.isActivated = true;
//             this.numCanvases = this.canvases.length;
//         }

//         // Init contexts for each canvas
//         const devicePixelRatio = window.devicePixelRatio || 1;
//         for (const canvas of this.canvases) {
//             const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
//             canvas.width = canvas.clientWidth * devicePixelRatio
//             canvas.height = canvas.clientHeight * devicePixelRatio
            
//             context.configure({
//                 device: this.device,
//                 format: this.textureFormat,
//                 alphaMode: "opaque" // All pixels should be opaque without any alpha??
//             });
//             this.contexts.push(context);
//         }

//         this.renderPipeline = device.createRenderPipeline({
//             layout: 'auto',
//             vertex: {
//                 module: device.createShaderModule({                    
//                     code: renderVertexFragmentShaders
//                 }),
//                 entryPoint: "vs_main",
//                 buffers:[
//                     {
//                         arrayStride: Float32Array.BYTES_PER_ELEMENT * 2,
//                         attributes: [
//                             {
//                                 //X-Y coordinates
//                                 shaderLocation: 0,
//                                 format: "float32x2",
//                                 offset: 0
//                             }
//                         ]
//                     },
//                     {
//                         arrayStride: Float32Array.BYTES_PER_ELEMENT,
//                         attributes: [
//                             {
//                                 //Vertex VoI shared with compute shader
//                                 shaderLocation: 1,
//                                 format: "float32",
//                                 offset: 0
//                             }
//                         ]
//                     }
//                 ]
//             },
//             fragment: {
//                 module: device.createShaderModule({                    
//                     code: renderVertexFragmentShaders
//                 }),
//                 entryPoint: "fs_main",
//                 targets: [
//                     {
//                         format: this.textureFormat as GPUTextureFormat
//                     }
//                 ]
//             },
//             primitive:{
//                 topology: "line-list",
//                 // cullMode: 'back'
//             },
//             depthStencil:{
//                 format: "depth24plus",
//                 depthWriteEnabled: true,
//                 depthCompare: "less"
//             }
//         });

//         for (const context of this.contexts) {
//             const renderPassDescriptor = {
//                 colorAttachments: [{
//                     view: context.getCurrentTexture().createView(),
//                     clearValue: { r: 0.3, g: 0.2, b: 0.4, a: 1.0 }, //background color
//                     loadOp: 'clear' as GPULoadOp,
//                     storeOp: 'store' as GPUStoreOp
//                 }],
//             };
//             this.renderPassDescriptors.push(renderPassDescriptor);
//         }
//     }

//     render(commandEncoder: GPUCommandEncoder, vertexBuffer: GPUBuffer, voiBuffer: GPUBuffer, indexBuffer: GPUBuffer, numberOfIndexes: number) {
//         for (let i=0; i<this.numCanvases; i++) {

//             const iRenderPassDescriptor = this.renderPassDescriptors[i] as GPURenderPassDescriptor;
//             const colorAttachments = iRenderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];
//             colorAttachments[0].view = this.contexts[i].getCurrentTexture().createView();
            
//             const passEncoder = commandEncoder.beginRenderPass(iRenderPassDescriptor);
//             passEncoder.setPipeline(this.renderPipeline);
//             passEncoder.setVertexBuffer(0, vertexBuffer);
//             passEncoder.setVertexBuffer(1, voiBuffer);
//             passEncoder.setIndexBuffer(indexBuffer, 'uint32');
//             passEncoder.drawIndexed(numberOfIndexes);
//             passEncoder.end();
//         }
//     }

}

export default PECGGraph;