import { meshObj } from '../helpers/helper';

class EnsightWriter {
    // This class is used to write the geometry, animation and states files in the Ensight format.
    // ATTENTION: we need the user selection of the folder as we use the File System Access API, so the window must be responsive
    // otherwise the user will not be able to select the folder and the code will throw an error due to the lack of the folderHandler or similar.
    // Moreover, as data comes as ArrayBuffer already from the gpu (states) and the meshData is TypedArray with a method .buffer() to obtain its ArrayBuffer,
    // we can directly write the data to the file without any further processing. This binary data is written with the default endianness of the system (generally little-endian).
    // that is why we use the DataView.setUint32() method with the last argument as true for little endian with only one int is written (e.g. the number of points or cells).
    // but if the client's computer save ArrayBuffers with big-endianness these single ints will be written with little-endianness and the rest of the data will be written with big-endianness 
    // and then paraview will close/throw an error. It will be ideal to check for the endiannes of the system and write the data accordingly. One solution for this is to use DataView and surf 
    // all the array's elems for changing the endianness of the data. But this is not feasible as it takes too much time and the dynamic written delays too much the simulation!!
    // Another solution will be to write these single ints (using this.writeUint()) in a Uint32Array of one elem and use await writable.write(Uint32Array.buffer()), I think the
    // Array buffer used as an argument in this case have the same endianness of the system => the same endianness of the other Float and ArrayBuffers.
    // Also, we are writting the ArrayBuffer at once, take into account this might be memory-wise prohibitive for large data sets, so we might need to write the data in chunks??.
    geometryFileName: string;
    animationFileName: string;
    statesFileName: string;
    folderHandler: any;

    private constructor(geometryFileName: string, animationFileName: string, statesFileName: string) {

        this.geometryFileName = geometryFileName;
        this.animationFileName = animationFileName;
        this.statesFileName = statesFileName;
        this.folderHandler = null;
    }

    static async create(geometryFileName: string, animationFileName: string, statesFileName: string): Promise<EnsightWriter> {
        const writer = new EnsightWriter(geometryFileName, animationFileName, statesFileName);
        await writer.defineFolderHandler();
        return writer;
    }

    private async defineFolderHandler(): Promise<void> {
        if ('showDirectoryPicker' in window) {
            try {
                // Prompt the user to select a folder
                this.folderHandler = await (window as any).showDirectoryPicker();
        
            } catch (error) {
                console.error('Error creating files:', error);
            }
        } else {
            throw new Error('showDirectoryPicker (File System Access API) is not supported in this browser.');
        }
    }

    async saveGeometry(meshData:meshObj):Promise<void> {

        // check if folderHandler is defined
        if (this.folderHandler == null) {
            throw new Error('Folder handler not defined');
        }

        // Open output animation file. This is a binary file
        const fileHandler = await this.folderHandler.getFileHandle(this.geometryFileName, { create: true });
            
        // Create a writable stream
        const writable = await fileHandler.createWritable();

        this.writeString('C Binary', writable);
        this.writeString('Ensight binary geometry file', writable);
        this.writeString(`Written by Cocoro vX.X.X`, writable);
        this.writeString('node id off', writable);
        this.writeString('element id off', writable);
        this.writeString('part', writable);
        this.writeUint(1, writable);
        this.writeString('Main part', writable);
        this.writeString('coordinates', writable);

        const numberOfVertices = Math.trunc(meshData.actual_points.length / 3);
        this.writeUint(numberOfVertices, writable);

        // We always have 3 dims as this data was already parsed and zeros were added in 1D and 2D cases
        await writable.write(new Float32Array(meshData.actual_points.filter((_, i) => i % 3 === 0)).buffer);
        await writable.write(new Float32Array(meshData.actual_points.filter((_, i) => i % 3 === 1)).buffer);
        await writable.write(new Float32Array(meshData.actual_points.filter((_, i) => i % 3 === 2)).buffer);

        let cellType = '';
        let vertexsPerCell: number;
        if (meshData.elementType == 'line'){
            cellType = 'bar2';
            vertexsPerCell = 2;
        }else if (meshData.elementType == 'quad'){
            cellType = 'quad4';
            vertexsPerCell = 4;
        }else if (meshData.elementType == 'hexa'){
            cellType = 'hexa8';
            vertexsPerCell = 8;
        }else{
            throw new Error(`Unsupported element type: ${meshData.elementType}`);
        }
        
        const nCells = Math.trunc(meshData.actual_elems.length / vertexsPerCell);
        this.writeString(cellType, writable);
        this.writeUint(nCells, writable);

        await writable.write(new Uint32Array(meshData.actual_elems.map(elem => elem + 1)).buffer);

        await writable.close();
    }

    async saveStates(states: ArrayBuffer, state_wildcard:string):Promise<void> {
        
        // check if folderHandler is defined
        if (this.folderHandler == null) {
            throw new Error('Folder handler not defined');
        }

        // Open output animation file. This is an ascii file
        const fileHandler = await this.folderHandler.getFileHandle(this.statesFileName + state_wildcard + '.ens', { create: true });
            
        // Create a writable stream
        const writable = await fileHandler.createWritable();
        
        // Write header
        this.writeString("Ensight Model Post Process", writable);
        this.writeString("part", writable);
        this.writeUint(1, writable);
        this.writeString("coordinates", writable);

        // Write scalar field.
        await writable.write(states);

        // Close file.
        await writable.close();
    }
    

    async saveAnimation(steps_num: number, time_inc:number, save_start:number): Promise<void> {

        // check if folderHandler is defined
        if (this.folderHandler == null) {
            throw new Error('Folder handler not defined');
        }

        // Open output animation file. This is an ascii file
        const fileHandler = await this.folderHandler.getFileHandle(this.animationFileName, { create: true });
            
        // Create a writable stream
        const writable = await fileHandler.createWritable();

        // Set number of wildcard symbols for steps.
        const wildcard_num = (steps_num - 1).toString().length;
        const asterisks = '*'.repeat(wildcard_num);

        // Write header.
        await writable.write(`# Ensight output generated by: Cocoro v.X.X.X\n\n`);
        await writable.write(`FORMAT\ntype: ensight gold\n\n`);
        await writable.write(`GEOMETRY\n`);
        await writable.write(`model: ${this.geometryFileName}\n\n`);
        
        await writable.write(`VARIABLE\n`);    
        await writable.write(`scalar per node: Potential ${this.statesFileName + asterisks}.ens\n\n`);
        
        await writable.write(`TIME\n`);
        await writable.write(`time set: 1\n`);   
        await writable.write(`number of steps: ${steps_num}\n`);
        await writable.write(`filename start number: 0\n`);
        await writable.write(`filename increment: 1\n`);
        await writable.write(`time values: `);

        // Write time increments
        let skip = 0;
        for (let i = 0; i < steps_num; ++i) {
            await writable.write(`${i * time_inc + save_start} `);
            skip++;

            if (skip === 30) {
                await writable.write(`\n             `);
            skip = 0;
            }
        }

        // Close stream
        await writable.close();
    }

    async writeString(data: string, writable: WritableStreamDefaultWriter) {
        const buffer = new ArrayBuffer(80);
        const view = new DataView(buffer);
        for (let i = 0; i < data.length; i++) {
            view.setUint8(i, data.charCodeAt(i));
        }
        await writable.write(buffer);
    }

    async writeUint(data: number, writable: WritableStreamDefaultWriter) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint32(0, data, true); // true for little-endian
        await writable.write(buffer);
    }

}

export default EnsightWriter;