import { CellObj } from '../helpers/interfaces';
import { GUI } from 'dat.gui';
import CellVarGraph from './CellVarGraph';

class CellVarGraphTissue extends CellVarGraph{
    
    nodeIdx: number;

    constructor(device: GPUDevice, canvas: HTMLCanvasElement, textureFormat: GPUTextureFormat, cellObj:CellObj, nNodes:number, gui:GUI) {
        
        super(device, canvas, textureFormat, cellObj, nNodes, gui);
        
        // Init gui based attributes
        const nodeIdxController = this.gui.__folders.Visualization.__controllers.find(c => c.property === "node_idx")
        if (nodeIdxController === undefined){ throw Error(`GUI controller node_idx not found!`)}
        this.nodeIdx = nodeIdxController.getValue();
        nodeIdxController.onChange((value) => {this.nodeIdx = value;});

        if ((this.nodeIdx<0) || (this.nodeIdx>=this.nNodes)){
            // Do not be stupid do not throw an error -> the graph will only show a constant value
            // throw new Error(`The selected node ${this.nodeIdx} is out of range of a mesh with ${this.nNodes} nodes`)
            console.log(`The selected node ${this.nodeIdx} is out of range for a mesh with ${this.nNodes} nodes`)
        }

    }


    render(commandEncoder: GPUCommandEncoder){
        
        // Update node idx buffer
        this.device.queue.writeBuffer(
            this.nodeIdxBuffer,
            0,
            new Uint32Array([this.nodeIdx]) //Is neccesary to make a UintArray even if it is one element
        );

        super.render(commandEncoder);

    }

}

export default CellVarGraphTissue;