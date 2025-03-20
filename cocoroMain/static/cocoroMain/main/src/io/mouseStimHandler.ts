import {mat4, vec3, vec4} from 'gl-matrix';
import { MeshObj } from '../helpers/interfaces';
import {mouseStimHandlerComputeShader1, reductionComputeShader, mouseStimHandlerComputeShader2} from './mouseStimShaders'
import { GUI } from 'dat.gui';

class MouseStimHandler {
    device: GPUDevice;
    meshData: MeshObj;
    isDragging: boolean;
    canvas: HTMLCanvasElement;
    vpMatrix: mat4;
    private rayOrigin: vec3;
    private rayDirection: vec3;
    private ray: Float32Array;            //This has the origin and dir concatenated
    boxMin: vec3;                 //The code is done in order to always have -1-1-1 and 1 1 1  in min and max BB respectively
    boxMax: vec3;
    nNodes : number;
    nVertexs : number;
    nRenderElems: number;
    gui: GUI;
    stimParams: {curr_amp: number, radius: number};
    maxWorkgroupSize : number;
    workGroupSize:     number;
    nWorkGroupsComputePipeline1: number;
    computePipeline1:   GPUComputePipeline;
    computeBindGroup1:  GPUBindGroup;
    computePipeline2:   GPUComputePipeline;	
    computeBindGroup2:  GPUBindGroup;
    rComputePipelines:  GPUComputePipeline[] = [];
    rComputeBindGroups: GPUBindGroup[] = [];
    rWorkgroupSize:     number[] = [];
    rNWorkgroups:       number[] = [];
    mouseStimBuffer:    GPUBuffer;
    rayBuffer:          GPUBuffer;
    stimParamsBuffer:   GPUBuffer;
    clipSpaceActualPoints: Float32Array;
    actualPointsMin: number;
    actualPointsMax: number;

    // As parameters for debugging
    rBuffersIndexes:    GPUBuffer[] = [];
    rBuffersValues:     GPUBuffer[] = [];
    perElemNearestCoordsBuffer: GPUBuffer;


    constructor(device: GPUDevice, meshData:MeshObj, canvas: HTMLCanvasElement, adapterLimits:GPUSupportedLimits) {
        this.isDragging = false;
        this.canvas = canvas;
        this.vpMatrix     = mat4.create(); 
        this.rayDirection = vec3.create();
        this.rayOrigin    = vec3.create();
        this.ray          = new Float32Array(2*3);
        this.boxMin = meshData.vertexs_min_bb;
        this.boxMax = meshData.vertexs_max_bb;
        this.device = device;
        this.meshData = meshData;
        this.nNodes   = Math.round(this.meshData.actual_points.length / 3);
        this.nVertexs = Math.round(this.meshData.vertexs.length / 3);
        this.workGroupSize = 64;
        const { new_arr, min, max } = this.normalizeFloat32ArrayToClipSpace(this.meshData.actual_points);
        this.clipSpaceActualPoints = new_arr;
        this.actualPointsMin = min;
        this.actualPointsMax = max;
        this.maxWorkgroupSize = adapterLimits.maxComputeInvocationsPerWorkgroup;
        if (this.meshData.elementType == 'line'){
            this.nRenderElems = Math.round(this.meshData.render_elems.length / 2);
        }else{
            this.nRenderElems = Math.round(this.meshData.render_elems.length / 3);
        }

        // Add Listeners -----------------------------------------------------------
        this.canvas.addEventListener('mousedown', (event) => {
            if (event.ctrlKey && event.button === 0) {
                this.isDragging = true;
                this.handleMouseClicked(event);
            }
        });

        this.canvas.addEventListener('mousemove', (event) => {
            if (this.isDragging) {
                this.handleMouseClicked(event);
            }
        });

        this.canvas.addEventListener('mouseup', (event) => {
            if (this.isDragging) {
                this.isDragging = false;
                this.device.queue.writeBuffer(this.mouseStimBuffer, 0, new Uint32Array(this.nNodes)); // We zero all stimulations
            }
        });

        // Add Gui -----------------------------------------------------------
        this.gui = new GUI({ autoPlace: true });
        const guiContainer = document.getElementById('mouseStim_gui') as HTMLDivElement;
        guiContainer.style.display = 'block'; // make it appear
        guiContainer.appendChild(this.gui.domElement);
        
        const stimFolder = this.gui.addFolder('Stimulus');
        this.stimParams = {
            curr_amp: 80, //Maybe define from stim cellObj I do not remember if stim field is passed through cellObj in tissue and not cell state
            radius: 2000,  // in um as the mesh should be in um  
        };
        stimFolder.add(this.stimParams, 'curr_amp');
        stimFolder.add(this.stimParams, 'radius');
        stimFolder.close();

        // Init compute -----------------------------------------------------------------
        // We init the buffers we will use
        // This vertexs position buffer can be with vertex in world space between -1-1-1 and 1,1,1
        // coords as the ray is changed back to world space coordinates so it match space of this vertexs
        // buffer
        const vertexPosBuffer = this.device.createBuffer({
            label: "MouseStimHandler_vertexPosBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.meshData.vertexs.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(vertexPosBuffer, 0, this.meshData.vertexs);

        const pointsPosBuffer = this.device.createBuffer({
            label: "MouseStimHandler_pointsPosBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.meshData.actual_points.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(pointsPosBuffer, 0, this.clipSpaceActualPoints);

        const renderElemsBuffer = this.device.createBuffer({
            label: "MouseStimHandler_renderElemsBuffer",
            size: Uint32Array.BYTES_PER_ELEMENT * this.meshData.render_elems.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        this.device.queue.writeBuffer(renderElemsBuffer, 0, this.meshData.render_elems);

        this.rayBuffer = this.device.createBuffer({
            label: "MouseStimHandler_rayBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * 2 * 3,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;
        // We do not init this buffer until we have a click and have computed the ray

        this.perElemNearestCoordsBuffer = this.device.createBuffer({
            label: "MouseStimHandler_perElemNearestCoordsBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.nRenderElems * 3,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.perElemNearestCoordsBuffer, 0, new Float32Array(this.nRenderElems * 3)); // TODO if we write this buffer entirelly in the shader we need to init it?

        // We need the maximum workgroup size we are able to use to improve performance
        var maxWorkgroupSizePerMemory = Math.floor(adapterLimits.maxComputeWorkgroupStorageSize / (Float32Array.BYTES_PER_ELEMENT + Uint32Array.BYTES_PER_ELEMENT));
        if (maxWorkgroupSizePerMemory<this.maxWorkgroupSize){
            // this computes the power of two <= to the maxWorkgroupSizePerMemory, we need maxWorkgroupSize to be a power of 2 in order 
            // to sum all values in the workgroup, cause if we have a current_size (see compute shader 2) that is odd we will not sum 
            // the last elem in the array.
            this.maxWorkgroupSize = 1 << (Math.floor(Math.log2(maxWorkgroupSizePerMemory)));
        }
        
        this.nWorkGroupsComputePipeline1 = Math.ceil(this.nRenderElems/this.maxWorkgroupSize)

        const perWorkgroupDistBuffer = this.device.createBuffer({
            label: "MouseStimHandler_perWorkgroupDistBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.nWorkGroupsComputePipeline1,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        }) as GPUBuffer;
        this.device.queue.writeBuffer(perWorkgroupDistBuffer, 0, new Float32Array(this.nWorkGroupsComputePipeline1)); // TODO if we write this buffer entirelly in the shader we need to init it?

        const perWorkgroupElemIdxBuffer = this.device.createBuffer({
            label: "MouseStimHandler_perWorkgroupElemIdxBuffer",
            size: Uint32Array.BYTES_PER_ELEMENT * this.nWorkGroupsComputePipeline1,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        }) as GPUBuffer;
        this.device.queue.writeBuffer(perWorkgroupElemIdxBuffer, 0, new Uint32Array(this.nWorkGroupsComputePipeline1)); // TODO if we write this buffer entirelly in the shader we need to init it?

        this.stimParamsBuffer = this.device.createBuffer({
            label: "MouseStimHandler_stimParamsBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * 2,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }) as GPUBuffer;

        // Init our main buffer
        this.mouseStimBuffer = this.device.createBuffer({
            label: "MouseStimHandler_mouseStimBuffer",
            size: Float32Array.BYTES_PER_ELEMENT * this.nNodes,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        }) as GPUBuffer;
        this.device.queue.writeBuffer(this.mouseStimBuffer, 0, new Float32Array(this.nNodes));


        // Set compute pipeline 1-----------------------------------------------------------
        this.computePipeline1 = this.device.createComputePipeline({
            label: 'MouseStimHandler_ComputePipeline1',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: mouseStimHandlerComputeShader1(this.meshData.elementType, this.nVertexs, this.nRenderElems, this.maxWorkgroupSize, this.nWorkGroupsComputePipeline1)}),
                entryPoint: 'comp_main',
            },
        });

        this.computeBindGroup1 = this.device.createBindGroup({
            label: 'MouseStimHandler_ComputeBindGroup1',
            layout: this.computePipeline1.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: vertexPosBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.meshData.vertexs.length,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: renderElemsBuffer,
                            offset: 0,
                            size: Uint32Array.BYTES_PER_ELEMENT * this.meshData.render_elems.length,
                        },
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: this.rayBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * 2 * 3,
                        },
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: this.perElemNearestCoordsBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * 3 * this.nRenderElems,
                        },
                    },
                    {
                        binding: 4,
                        resource: {
                            buffer: perWorkgroupDistBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.nWorkGroupsComputePipeline1,
                        },
                    },
                    {
                        binding: 5,
                        resource: {
                            buffer: perWorkgroupElemIdxBuffer,
                            offset: 0,
                            size: Uint32Array.BYTES_PER_ELEMENT * this.nWorkGroupsComputePipeline1,
                        },
                    }
                ],
        });

        // Set intermidiate compute pipelines -----------------------------------------------------------
        // We need to calculate and init as many computing pipelines to perform the entire reduction
        // of the minimum value of distance in all elems. Be are limitate by the maxWorkGroupSize that can be used for avoiding data races
        // these compute pipelines are the reduction compute pipelines
        this.rBuffersValues = [perWorkgroupDistBuffer];
        this.rBuffersIndexes = [perWorkgroupElemIdxBuffer];
        var tmpNWorkgroups = this.nWorkGroupsComputePipeline1;
        var i = 0;
        while (tmpNWorkgroups>1){

            this.rWorkgroupSize.push(Math.min(this.maxWorkgroupSize, 1 << (Math.ceil(Math.log2(tmpNWorkgroups)))));
            this.rNWorkgroups.push(Math.ceil(tmpNWorkgroups / this.rWorkgroupSize[i]));
            
            // console.log(reductionComputeShader(tmpNWorkgroups, this.rNWorkgroups[i], this.rWorkgroupSize[i]));
            this.rComputePipelines.push(this.device.createComputePipeline({
                label: `MouseStimHandler_rComputePipeline${i}`,
                layout: 'auto',
                compute: {
                    module: this.device.createShaderModule({
                    code: reductionComputeShader(tmpNWorkgroups, this.rNWorkgroups[i], this.rWorkgroupSize[i])}),
                    entryPoint: 'comp_main',
                },
            }));

            const valuesBuffer = this.device.createBuffer({
                label: `MouseStimHandler_valuesBuffer${i}`,
                size: Float32Array.BYTES_PER_ELEMENT * this.rNWorkgroups[i],
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            }) as GPUBuffer;
            this.device.queue.writeBuffer(valuesBuffer, 0, new Float32Array(this.rNWorkgroups[i]));

            const indexesBuffer = this.device.createBuffer({
                label: `MouseStimHandler_indexesBuffer${i}`,
                size: Uint32Array.BYTES_PER_ELEMENT * this.rNWorkgroups[i],
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            }) as GPUBuffer;
            this.device.queue.writeBuffer(indexesBuffer, 0, new Uint32Array(this.rNWorkgroups[i]));

            this.rBuffersValues.push(valuesBuffer);
            this.rBuffersIndexes.push(indexesBuffer);

            this.rComputeBindGroups.push(this.device.createBindGroup({
                label: `MouseStimHandler_rComputeBindGroup${i}`,
                layout: this.rComputePipelines[i].getBindGroupLayout(0),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.rBuffersValues[i],
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * tmpNWorkgroups,
                            },
                        },
                        {
                            binding: 1,
                            resource: {
                                buffer: this.rBuffersIndexes[i],
                                offset: 0,
                                size: Uint32Array.BYTES_PER_ELEMENT * tmpNWorkgroups,
                            },
                        },
                        {
                            binding: 2,
                            resource: {
                                buffer: this.rBuffersValues[i+1],
                                offset: 0,
                                size: Float32Array.BYTES_PER_ELEMENT * this.rNWorkgroups[i],
                            },
                        },
                        {
                            binding: 3,
                            resource: {
                                buffer: this.rBuffersIndexes[i+1],
                                offset: 0,
                                size: Uint32Array.BYTES_PER_ELEMENT *  this.rNWorkgroups[i],
                            },
                        }
                    ],
            }));

            tmpNWorkgroups = this.rNWorkgroups[i];
            i++;
        }

        // Set compute pipeline 2 -----------------------------------------------------------
        this.computePipeline2 = this.device.createComputePipeline({
            label: 'MouseStimHandler_ComputePipeline2',
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                code: mouseStimHandlerComputeShader2(this.nNodes, this.nRenderElems, this.workGroupSize)}),
                entryPoint: 'comp_main',
            },
        });

        this.computeBindGroup2 = this.device.createBindGroup({
            label: 'MouseStimHandler_ComputeBindGroup2',
            layout: this.computePipeline2.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: pointsPosBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.meshData.actual_points.length,
                        },
                    },
                    {
                        binding: 1,
                        resource: {
                            buffer: this.perElemNearestCoordsBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * 3 * this.nRenderElems,
                        },
                    },
                    {
                        binding: 2,
                        resource: {
                            buffer: this.rBuffersIndexes[this.rBuffersIndexes.length-1],
                            offset: 0,
                            size: Uint32Array.BYTES_PER_ELEMENT * 1,
                        },
                    },
                    {
                        binding: 3,
                        resource: {
                            buffer: this.stimParamsBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * 2,
                        },
                    },
                    {
                        binding: 4,
                        resource: {
                            buffer: this.mouseStimBuffer,
                            offset: 0,
                            size: Float32Array.BYTES_PER_ELEMENT * this.nNodes,   // for bools in wgsl we need to save 4 bytes so we used uint32array.bytes_per_element
                        },
                    }
                ],
        });

    }

    private handleMouseClicked(event: MouseEvent) {
        // Get the origin of the point of stim in the near canvas 2D plane and its direction to the far plane
        // https://learnopengl.com/Getting-started/Coordinate-Systems
        this.getRay(event)

        // Now we have the ray we need to apply ray casting to obtain the node position in 3D space
        // First we check if the ray intersects with the bounding box BB of the node
        const intersectedBB:boolean = this.rayIntersectsBB();

        if(intersectedBB){
            this.computeNodesToStim();
        }
    }


    cameraUpdate(vpMatrix: mat4) {
        this.vpMatrix = vpMatrix;
    }

    private getRay(event: MouseEvent){
        // Get the normalized point of stimulus
        const x = ((event.clientX - this.canvas.getBoundingClientRect().left) / this.canvas.getBoundingClientRect().width) * 2 - 1;
        const y = -(((event.clientY - this.canvas.getBoundingClientRect().top) / this.canvas.getBoundingClientRect().height) * 2 - 1);

        const invViewProj = mat4.create();
        mat4.invert(invViewProj, this.vpMatrix);

        // Near and far points in clip space
        const nearPoint = vec4.fromValues(x, y, -1, 1);
        const farPoint = vec4.fromValues(x, y, 1, 1);

        // Transform to world space
        vec4.transformMat4(nearPoint, nearPoint, invViewProj);
        vec4.transformMat4(farPoint, farPoint, invViewProj);

        // Convert from homogeneous coordinates
        vec3.scale(nearPoint as vec3, nearPoint as vec3, 1 / nearPoint[3]);
        vec3.scale(farPoint as vec3, farPoint as vec3, 1 / farPoint[3]);

        // Compute ray
        vec3.set(this.rayOrigin, nearPoint[0], nearPoint[1], nearPoint[2]);
        vec3.sub(this.rayDirection, farPoint as vec3, this.rayOrigin);
        vec3.normalize(this.rayDirection, this.rayDirection);

        this.ray.set(this.rayOrigin, 0);
        this.ray.set(this.rayDirection, this.rayOrigin.length)
    }

    normalizeFloat32ArrayToClipSpace(arr: Float32Array): { new_arr: Float32Array, min: number, max: number } {    
        // This seems the fastest way to get this done
        var new_arr = new Float32Array(arr.length);
        
        // First pass: Find min and max
        let min = arr[0];
        let max = arr[0];
    
        for (let i = 1; i < arr.length; i++) {
            if (arr[i] < min) min = arr[i];
            if (arr[i] > max) max = arr[i];
        }
    
        const range = max - min;
        if (range === 0) {
            // If all values are the same, normalize to 0
            new_arr.fill(0);
            return { new_arr, min, max };
        }
    
        // Second pass: Normalize in place
        for (let i = 0; i < arr.length; i++) {
            new_arr[i] = ((arr[i] - min) / range) * 2 - 1;
        }

        return { new_arr, min, max };
    }

    rayIntersectsBB(): boolean {
        let tMin = -Infinity;
        let tMax = Infinity;
    
        for (let i = 0; i < 3; i++) {
            if (Math.abs(this.rayDirection[i]) < 1e-6) {
                if (this.rayOrigin[i] < this.boxMin[i] || this.rayOrigin[i] > this.boxMax[i]) return false;
            } else {
                const t1 = (this.boxMin[i] - this.rayOrigin[i]) / this.rayDirection[i];
                const t2 = (this.boxMax[i] - this.rayOrigin[i]) / this.rayDirection[i];
                tMin = Math.max(tMin, Math.min(t1, t2));
                tMax = Math.min(tMax, Math.max(t1, t2));
            }
        }
        return tMax >= Math.max(tMin, 0);
    }

    private async computeNodesToStim(): Promise<void> {

        // Write Ray Buffer
        this.device.queue.writeBuffer(this.rayBuffer, 0, this.ray);
        this.device.queue.writeBuffer(this.stimParamsBuffer, 
                                      0,
                                      new Float32Array([this.stimParams.curr_amp, this.stimParams.radius / (this.actualPointsMax - this.actualPointsMin)])); // We normalize the radius to clip space

        // launch
        const commandEncoder = this.device.createCommandEncoder();
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline1);
            passEncoder.setBindGroup(0, this.computeBindGroup1);
            passEncoder.dispatchWorkgroups(this.nWorkGroupsComputePipeline1);
            passEncoder.end();
        }
        for(let i=0; i<this.rNWorkgroups.length; i++){
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.rComputePipelines[i]);
            passEncoder.setBindGroup(0, this.rComputeBindGroups[i]);
            passEncoder.dispatchWorkgroups(this.rNWorkgroups[i]);
            passEncoder.end();
        }
        {
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline2);
            passEncoder.setBindGroup(0, this.computeBindGroup2);
            passEncoder.dispatchWorkgroups(Math.ceil(this.nNodes/this.workGroupSize));
            passEncoder.end();
        }

        // Debug the ray casting
        // const readDebugBuffer = this.device.createBuffer({
        //     label: 'Read Debug Buffer',
        //     size: this.rBuffersIndexes[this.rBuffersIndexes.length-1].size,
        //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        // });
        // commandEncoder.copyBufferToBuffer(this.rBuffersIndexes[this.rBuffersIndexes.length-1], 0, readDebugBuffer, 0, this.rBuffersIndexes[this.rBuffersIndexes.length-1].size);

        // const readDebugBuffer2 = this.device.createBuffer({
        //     label: 'Read Debug Buffer2',
        //     size: this.rBuffersValues[this.rBuffersValues.length-1].size,
        //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        // });
        // commandEncoder.copyBufferToBuffer(this.rBuffersValues[this.rBuffersValues.length-1], 0, readDebugBuffer2, 0, this.rBuffersValues[this.rBuffersValues.length-1].size);

        // const readDebugBuffer3 = this.device.createBuffer({
        //     label: 'Read Debug Buffer3',
        //     size: Float32Array.BYTES_PER_ELEMENT * this.nRenderElems * 3,
        //     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        // });
        // commandEncoder.copyBufferToBuffer(this.perElemNearestCoordsBuffer, 0, readDebugBuffer3, 0, Float32Array.BYTES_PER_ELEMENT * this.nRenderElems * 3);

        const gpuCommands = commandEncoder.finish();
        this.device.queue.submit([gpuCommands]);

        // await readDebugBuffer.mapAsync(GPUMapMode.READ);
        // const arrayBuffer = readDebugBuffer.getMappedRange();
        // const res1 = new Uint32Array(arrayBuffer)
        // console.log(res1);


        // await readDebugBuffer2.mapAsync(GPUMapMode.READ);
        // const arrayBuffer2 = readDebugBuffer2.getMappedRange();
        // const res2 = new Float32Array(arrayBuffer2)
        // console.log(res2);

        // await readDebugBuffer3.mapAsync(GPUMapMode.READ);
        // const arrayBuffer3 = readDebugBuffer3.getMappedRange();
        // const res3 = new Float32Array(arrayBuffer3);
        // const res4 = new Float32Array(res3);
        // console.log(res3);
        // console.log(res3[res1[0]*3+0], res3[res1[0]*3+1], res3[res1[0]*3+2]);

        // for (let i = 0; i < res4.length; i++) {
        //     res4[i] = ((res4[i] + 1) / 2) * (this.actualPointsMax - this.actualPointsMin) + this.actualPointsMin;
        // }
        // console.log(res4);
        // console.log(res4[res1[0]*3+0], res4[res1[0]*3+1], res4[res1[0]*3+2]);

    }

    
}

export default MouseStimHandler;