import Simulation from './Simulation';
import CellVarGraphCell from '../graphs/CellVarGraphCell';
import { GUI } from 'dat.gui';
import { CellObj } from "../helpers/interfaces";
import { computeCellModel } from '../cellular_shaders/computeCellModel.js'

class CellSim extends Simulation {

    // CellSim is a class for generating simulators that simulate and RENDER a cellular model implemented

    // TODO The ideal would be that the ! is not needed but we need to wait until we have a gpu device
    // otherwise all code fordward would end in a error, as all values obtained in initGPU are undefined!
    graph!: CellVarGraphCell;
    computeBindGroupEntries!: GPUBindGroupEntry[];
    computePipeline!: GPUComputePipeline;
    computeBindGroup!: GPUBindGroup;

    // Private constructor as we use the static create for instantiating this class
    private constructor(gui:GUI, cellObj:CellObj) {
        super(gui, cellObj);
        // Some Info
        console.log(`CELLULAR SIMULATION --------------------------------------------`);
        console.log(`Cell model: ${this.cellObj.cellModel}`);

        this.readAndUpdateGUI();
        
        // we update our arrays and create the buffers with right sizes
        this.stimArray         = new Float32Array([this.cellObj.stim.period, this.cellObj.stim.amp, this.cellObj.stim.dur, this.cellObj.stim.start]);
        this.statesArray       = new Float32Array(Object.values(this.cellObj.states));
        this.constantsArray    = new Float32Array(Object.values(this.cellObj.constants));
        this.integrationArray  = new Float32Array([this.integ.dt]);
        this.visualParamsArray = new Float32Array([this.plot_dt]);

        // simulate is the method where the simulation (rendering and computation occurs) 
        // as we use requestAnimationFrame, the simulate methods looses the this context 
        // so we need to bind this method to the correct object/instance
        this.simulate = this.simulate.bind(this)

    }

    static async create(gui:GUI, cellObj:CellObj): Promise<CellSim> {
        const simulator = new CellSim(gui, cellObj);
        await simulator.initGPU();

        // get graph for plotting the results
        simulator.graph = new CellVarGraphCell(simulator.device, simulator.gpu_canvas, simulator.gpu_textureformat, simulator.cellObj, simulator.gui);
        
        // init some buffers
        simulator.initBuffers();

        // when simulating a cell we can load the visualization buffer 
        // as it only has plot_dt which is fixed at run time. Moreover
        // we need to bind the statesbuffer to the graph which will read its values and update
        // the graph according to the decisions of the user
        simulator.device.queue.writeBuffer(simulator.visualParamsBuffer,0, simulator.visualParamsArray);
        simulator.graph.setStatesBuffer(simulator.statesBuffer, Float32Array.BYTES_PER_ELEMENT * simulator.statesArray.length);

        simulator.computeBindGroupEntries = [
            {
                binding: 0,
                resource: {
                    buffer: simulator.statesBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * simulator.statesArray.length,
                },
            },
            {
                binding: 1,
                resource: {
                    buffer: simulator.constantsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * simulator.constantsArray.length,
                },
            },
            {
                binding: 2,
                resource: {
                    buffer: simulator.stimBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * simulator.stimArray.length,
                },
            },
            {
                binding: 3,
                resource: {
                    buffer: simulator.integBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * simulator.integrationArray.length,
                },
            },
            {
                binding: 4,
                resource: {
                    buffer: simulator.visualParamsBuffer,
                    offset: 0,
                    size: Float32Array.BYTES_PER_ELEMENT * simulator.visualParamsArray.length,
                },
            }
        ];

        console.log(computeCellModel(simulator.cellObj.cellModel, simulator.saveStart, simulator.debugStart, simulator.debugStateName, simulator.computeBindGroupEntries.length))
        simulator.computePipeline = simulator.device.createComputePipeline({
            label: 'CellSim_ComputeShader',
            layout: 'auto',
            compute: {
            module: simulator.device.createShaderModule({
                code: computeCellModel(simulator.cellObj.cellModel, simulator.saveStart, simulator.debugStart, simulator.debugStateName, simulator.computeBindGroupEntries.length),
            }),
            entryPoint: 'comp_main',
            },
        });

        // This updates the computeBindGroupEntries so we need to call this before creating the bindGroup and after we pass
        // the bindings length to the computeShader generator
        simulator.saveOrDebug();

        simulator.computeBindGroup = simulator.device.createBindGroup({
            label: 'CellSim_ComputePipelineBindgroup',
            layout: simulator.computePipeline.getBindGroupLayout(0),
                entries: simulator.computeBindGroupEntries,
        });

        return simulator;
    }

    async simulate(){
        this.stats.begin();

        if (!this.integ.simulate) {
            this.stats.end();
            requestAnimationFrame(this.simulate); // Keep looping but do nothing
            return;
        }

        //Update Params
        this.device.queue.writeBuffer(
            this.stimBuffer,
            0,
            new Float32Array([this.cellObj.stim.period, this.cellObj.stim.amp, this.cellObj.stim.dur, this.cellObj.stim.start])
        );
        this.device.queue.writeBuffer(
            this.constantsBuffer,
            0,
            new Float32Array(Object.values(this.cellObj.constants))
        );
        this.device.queue.writeBuffer(
            this.integBuffer,
            0,
            new Float32Array([
                this.integ.simulate ? this.integ.dt : 0.0, // I think this is not necessary  
            ])
        );
        
        //Generate the command encoder for both pipelines (Render and Compute)
        //and send them to the gpu
        const commandEncoder = this.device.createCommandEncoder();
        {   //Compute Update - The cell has the loop inside so the multiple computes are already in the one iteration of the computeShader
            // which is different to the tissue sims as here in the cell we do not have data race due to spatial derivatives computation
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(this.computePipeline);
            passEncoder.setBindGroup(0, this.computeBindGroup);
            passEncoder.dispatchWorkgroups(1);
            passEncoder.end();
        }
        // Make the graph render!
        this.graph.render(commandEncoder);
        
        // in case the user wanted to save or debug we need to say it to the gpu
        this.copyInfoFromGPU(commandEncoder);

        // submit for ACTION
        this.device.queue.submit([commandEncoder.finish()]);

        // Get info to the CPU and print it or save it
        // The save data is particular for cell or tissue
        if (this.integ.simulation_time >= this.saveStart && this.stepsCount <= this.totalStepsToSave-1 && this.integ.simulate) {
    
            // Get the data from the gpu
            await this.readSaveBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = this.readSaveBuffer.getMappedRange();

            // TODO think of a writer for this data
            
            this.savedSimulation = true;
            this.stepsCount++;
        } 

        if (this.stepsCount > this.totalStepsToSave-1 && this.savedSimulation) {
            this.savedSimulation = false;
        } 

        // We need to await for the buffer to get read
        await this.handleDebugInfoInCPU();

        // Update simulation time
        this.integ.simulation_time += this.plot_dt;

        this.stats.end();

        // Keep going...
        requestAnimationFrame(this.simulate);
    }

}

export default CellSim;