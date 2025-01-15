
import { extraCanvases } from '../helpers/helper';
import CellVarGraph from './CellVarGraph';
import { GUI } from 'dat.gui';
import { cellObj } from '../helpers/manageCellModelGUI';

class GraphsRenderer {
    // This class is used to manage the renders for graphs

    device: GPUDevice;
    textureFormat: GPUTextureFormat;
    canvases: extraCanvases;
    isActivated: boolean = false;
    cellObj: cellObj;
    nNodes: number;
    guiCellVarGraph: GUI;
    guiPECGGraph: GUI;

    
    // For now we only allow two canvases at the same time, one cellVar and the other pECG
    cellVarGraph: CellVarGraph|undefined = undefined;
    // pECGGraph: pECGGraph|undefined = undefined; 


    constructor(device: GPUDevice, textureFormat: GPUTextureFormat, canvases: extraCanvases, 
                cellObj:cellObj, nNodes:number, guiCellVarGraph:GUI, guiPECGGraph:GUI) {
        this.device = device;
        this.textureFormat = textureFormat;
        this.canvases = canvases;
        this.cellObj = cellObj;
        this.nNodes    = nNodes;
        this.guiCellVarGraph = guiCellVarGraph;
        this.guiPECGGraph    = guiPECGGraph;

        if ((this.canvases.cellVar != undefined) || (this.canvases.pECG != undefined)){
            this.isActivated = true;
        }

        // Init graphs
        if (this.canvases.cellVar != undefined){
            this.cellVarGraph = new CellVarGraph(this.device, this.canvases.cellVar, this.textureFormat, this.cellObj, this.nNodes, this.guiCellVarGraph);
        }
        // if (this.canvases.pECG != undefined){
        //     this.pECGGraph = new PECGGraph()
        // }
        
    }

    setStatesBuffer(statesBuffer:GPUBuffer, statesByteLength:number){
        if (this.cellVarGraph != undefined){
            this.cellVarGraph.setStatesBuffer(statesBuffer, statesByteLength)
        }
        // if (this.pECGGraph != undefined){
        //     this.pECGGraph.setStatesBuffer(statesBuffer, statesByteLength)
        // }
        
    }

    render(commandEncoder: GPUCommandEncoder) {
        if (this.cellVarGraph != undefined){
            this.cellVarGraph.render(commandEncoder);
        }
        // if (this.pECGGraph != undefined){
        //     this.pECGGraph.setStatesBuffer(statesBuffer, statesByteLength)
        // }
    }

}

export default GraphsRenderer;