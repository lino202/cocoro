import Stats from "stats.js";
import { initGPU } from '../helpers/helper';
import { GUI } from 'dat.gui';
import { CellObj, ExtraCanvases } from "../helpers/interfaces";


interface Integ {
    simulate: boolean;
    dt: number;
    simulation_time: number;
    [key: string]: any; // Allows additional properties
}

abstract class Simulation {
    // Abstract class for definning simulation scenarios, for now only for electrophysiological simulations
    
    stats            : Stats;
    integ            : Integ;
    gui              : GUI;
    plot_dt          : number = 0;
    nNodes           : number = 1;
    workgroup_size   : number = 64;
    saveStart        : number = -1;
    saveEnd          : number = -1;
    debugStart       : number = -1;
    debugEnd         : number = -1;
    debugStateName   : string = 'vm';
    cellObj          : CellObj;
    savedSimulation  : boolean = false;
    totalStepsToSave : number = 0;
    stepsCount       : number = 0;
    vmArray          : Float32Array = new Float32Array();
    stimArray        : Float32Array = new Float32Array();
    statesArray      : Float32Array = new Float32Array();
    constantsArray   : Float32Array = new Float32Array();
    integrationArray : Float32Array = new Float32Array();
    visualParamsArray: Float32Array = new Float32Array();

    // TODO this is badddd coding  :'( -> rethink to init this in the constructor, we need to await for the gpu device
    statesBuffer !: GPUBuffer;
    constantsBuffer !: GPUBuffer;
    stimBuffer !: GPUBuffer;
    integBuffer !: GPUBuffer;
    visualParamsBuffer !: GPUBuffer;
    saveBuffer !: GPUBuffer;
    readSaveBuffer !: GPUBuffer;
    debugBuffer !: GPUBuffer;
    readDebugBuffer !: GPUBuffer;
    device!: GPUDevice;
    gpu_context!: GPUCanvasContext;
    gpu_canvas!: HTMLCanvasElement;
    gpu_textureformat!: GPUTextureFormat;
    gpu_extracanvases!: ExtraCanvases;
    gpu_limits!:        GPUSupportedLimits;
    computeBindGroupEntries : GPUBindGroupEntry[] = [];
    


    constructor(gui:GUI, cellObj:CellObj) {
        // Init constructor passed args
        this.gui = gui;
        this.cellObj = cellObj;

        // Start statistics 
        this.stats = new Stats();
        this.stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;cursor:pointer;opacity:0.9;z-index:10000';
        document.body.appendChild( this.stats.dom );

        // Set default (for now) integration params
        this.integ = {
            simulate: true,
            dt : 0.02,
            simulation_time : 0,
        }

    }

    async initGPU(){
        // Get the device
        const gpu = await initGPU();
        this.device = gpu.device;
        this.gpu_context       = gpu.context;
        this.gpu_canvas        = gpu.canvas;
        this.gpu_textureformat = gpu.textureFormat;
        this.gpu_extracanvases = gpu.extraCanvases
        this.gpu_limits        = gpu.adapterLimits;
    }

    readAndUpdateGUI(){

        // Integration is added on run simulation as we need the meshData info for setting dx
        const integFolder = this.gui.addFolder('Integration');
        Object.keys(this.integ).forEach((k) => {
            if (k=="simulation_time"){
                integFolder.add(this.integ, k).listen();
            }else{
                integFolder.add(this.integ, k);
            }
        });

        // Init gui based attributes
        const plotDtController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "plot_dt")
        if (plotDtController === undefined){ throw Error(`GUI controller plot_dt not found!`)}
        this.plot_dt = plotDtController.getValue();
        // plotDtController.onChange((value) => {this.plot_dt = value;}); for now, not available

        const workGroupController = this.gui.__folders.gpuSettings.__controllers.find(c => c.property === "workgroup_size")
        if (workGroupController === undefined){ throw Error(`GUI controller workgroup_size not found!`)}
        this.workgroup_size = workGroupController.getValue();
        // workGroupController.onChange((value) => {this.workgroup_size = value;}); for now, not available

        const saveStartController = this.gui.__folders.Save.__controllers.find(c => c.property === "start")
        if (saveStartController === undefined){ throw Error(`GUI controller start not found!`)}
        this.saveStart = saveStartController.getValue();
        // saveStartController.onChange((value) => {this.saveStart = value;}); for now, not available

        const saveEndController = this.gui.__folders.Save.__controllers.find(c => c.property === "end")
        if (saveEndController === undefined){ throw Error(`GUI controller end not found!`)}
        this.saveEnd = saveEndController.getValue();
        // saveEndController.onChange((value) => {this.saveEnd = value;}); for now, not available

        const debugStartController = this.gui.__folders.Debug.__controllers.find(c => c.property === "start")
        if (debugStartController === undefined){ throw Error(`GUI controller start not found!`)}
        this.debugStart = debugStartController.getValue();
        // debugStartController.onChange((value) => {this.debugStart = value;}); for now, not available

        const debugEndController = this.gui.__folders.Debug.__controllers.find(c => c.property === "end")
        if (debugEndController === undefined){ throw Error(`GUI controller end not found!`)}
        this.debugEnd = debugEndController.getValue();
        // debugEndController.onChange((value) => {this.debugEnd = value;}); for now, not available

        const debugStateNameController = this.gui.__folders.Debug.__controllers.find(c => c.property === "state_name")
        if (debugStateNameController === undefined){ throw Error(`GUI controller state_name not found!`)}
        this.debugStateName = debugStateNameController.getValue();
        // debugStateNameController.onChange((value) => {this.debugStateName = value;}); for now, not available

    }


    initBuffers(){
        // create common buffers and init the ones that can be init
        // ATTENTION Some of the buffers can be uniforms but are defined as storage due to 
        // the requirement of the uniform array to be smaller than a certain number
        // For example stim can be with no problem a uniform for the cell sim, but if we 
        // simulate tissue with a lot of nodes we will have an error regarding this
        this.statesBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT * this.statesArray.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.statesBuffer, 0, this.statesArray);

        // This buffers can be changed by the user at run time -> no write them here
        this.constantsBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT * this.constantsArray.length,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.stimBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT * this.stimArray.length,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.integBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT * this.integrationArray.length,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.visualParamsBuffer = this.device.createBuffer({
            size: Float32Array.BYTES_PER_ELEMENT * this.visualParamsArray.length,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }


    saveOrDebug(){
        // Save 
        if (this.saveStart >= 0) {
            this.saveBuffer = this.device.createBuffer({
                size: Float32Array.BYTES_PER_ELEMENT * this.nNodes,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.saveBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.nNodes,
                },
            });
            this.totalStepsToSave = Math.floor((this.saveEnd - this.saveStart) / this.plot_dt) + 1;
        }

        // Debug 
        if (this.debugStart >= 0) {
            if (!(this.debugStateName in this.cellObj.states)) {
                throw new Error(`Debug state name "${this.debugStateName}" is not a valid state for ${this.cellObj.cellModel} cell model`);
            }
            this.debugBuffer = this.device.createBuffer({
                size: Float32Array.BYTES_PER_ELEMENT * this.nNodes,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
            });
            this.computeBindGroupEntries.push({
                binding: this.computeBindGroupEntries.length,
                resource: {
                    buffer: this.debugBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * this.nNodes,
                },
            });
        }
    }

    copyInfoFromGPU(commandEncoder: GPUCommandEncoder){
        // For now we only use save or debug buffers for acquiring data from GPU
        // we need to tell the gpu that needs to copy thos data to a readBuffer that we can map back to the CPU
        if (this.integ.simulation_time >= this.saveStart && this.stepsCount <= this.totalStepsToSave-1 && this.integ.simulate) {
            this.readSaveBuffer = this.device.createBuffer({
                label: 'Read Save Buffer',
                size: this.nNodes * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            commandEncoder.copyBufferToBuffer(this.saveBuffer, 0, this.readSaveBuffer, 0, this.nNodes * Float32Array.BYTES_PER_ELEMENT);
        }
        if (this.integ.simulation_time >= this.debugStart && this.integ.simulation_time <= this.debugEnd && this.integ.simulate) {
            this.readDebugBuffer = this.device.createBuffer({
                label: 'Read Save Buffer',
                size: this.nNodes * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            commandEncoder.copyBufferToBuffer(this.debugBuffer, 0, this.readDebugBuffer, 0, this.nNodes * Float32Array.BYTES_PER_ELEMENT);
        }

    }

    async handleDebugInfoInCPU(){
        // We map back to the CPU the required info print it
        if (this.integ.simulation_time >= this.debugStart && this.integ.simulation_time <= this.debugEnd && this.integ.simulate) {
            await this.readDebugBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = this.readDebugBuffer.getMappedRange();
            console.log(this.integ.simulation_time)
            console.log(new Float32Array(arrayBuffer));
        }

    }


}

export default Simulation;