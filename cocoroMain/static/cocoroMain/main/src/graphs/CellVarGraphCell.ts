
import { CellObj } from '../helpers/interfaces';
import { GUI } from 'dat.gui';
import CellVarGraph from './CellVarGraph';

class CellVarGraphCell extends CellVarGraph {
    // This class allows to render the simulation of a cell as a 1D graph 
    // as it is one cell, the number of nodes is juts one and the idx is 0!!

    constructor(device:GPUDevice, canvas:HTMLCanvasElement, textureFormat:GPUTextureFormat, cellObj:CellObj, gui:GUI) {
        super(device, canvas, textureFormat, cellObj, 1, gui);

        this.device.queue.writeBuffer(
            this.nodeIdxBuffer,
            0,
            new Uint32Array([0]) //Is neccesary to make a UintArray even if it is one element
        );

    }

}

export default CellVarGraphCell;