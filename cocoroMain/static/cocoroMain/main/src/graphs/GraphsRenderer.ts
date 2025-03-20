
import { ExtraCanvases, CellObj, MeshObj, ElectrodesObj } from '../helpers/interfaces';
import CellVarGraphTissue from './CellVarGraphTissue';
import PECGGraph from './PECGGraph';
import { GUI } from 'dat.gui';

class GraphsRenderer {
    // This class is used to manage the renders for graphs

    device          : GPUDevice;
    textureFormat   : GPUTextureFormat;
    canvases        : ExtraCanvases;
    isActivated     : boolean = false;
    cellObj         : CellObj;
    nNodes          : number;
    guiCellVarGraph : GUI;
    guiPECGGraph    : GUI;

    // For now we only allow two canvases at the same time, one cellVar and the other pECG
    cellVarGraph: CellVarGraphTissue|undefined = undefined;
    pECGGraph   : PECGGraph|undefined = undefined; 

    constructor(device:GPUDevice, textureFormat:GPUTextureFormat, canvases:ExtraCanvases, adapterLimits:GPUSupportedLimits,
                cellObj:CellObj, meshData:MeshObj, electrodesData:ElectrodesObj, guiCellVarGraph:GUI, guiPECGGraph:GUI) {
        this.device = device;
        this.textureFormat = textureFormat;
        this.canvases = canvases;
        this.cellObj = cellObj;
        this.nNodes    = Math.trunc(meshData.actual_points.length / 3);
        this.guiCellVarGraph = guiCellVarGraph;
        this.guiPECGGraph    = guiPECGGraph;

        if ((this.canvases.cellVar != undefined) || (this.canvases.pECG != undefined)){
            this.isActivated = true;
        }

        // Init graphs
        if (this.canvases.cellVar != undefined){
            this.cellVarGraph = new CellVarGraphTissue(this.device, this.canvases.cellVar, this.textureFormat, this.cellObj, this.nNodes, this.guiCellVarGraph);
        }
        if (this.canvases.pECG != undefined){
            this.pECGGraph = new PECGGraph(this.device, this.canvases.pECG, this.textureFormat, this.cellObj, meshData, electrodesData, this.nNodes, adapterLimits, this.guiPECGGraph)
        }
        
    }

    setStatesBuffer(statesBuffer:GPUBuffer, statesByteLength:number){
        if (this.cellVarGraph != undefined){
            this.cellVarGraph.setStatesBuffer(statesBuffer, statesByteLength)
        }
        if (this.pECGGraph != undefined){
            this.pECGGraph.setStatesBuffer(statesBuffer, statesByteLength)
        }
        
    }

    render(commandEncoder: GPUCommandEncoder) {
        if (this.cellVarGraph != undefined){
            this.cellVarGraph.render(commandEncoder);
        }
        if (this.pECGGraph != undefined){
            this.pECGGraph.render(commandEncoder)
        }
    }

}

export default GraphsRenderer;