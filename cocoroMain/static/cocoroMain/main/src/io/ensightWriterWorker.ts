async function writeString(data: string, writable: WritableStreamDefaultWriter) {
    const buffer = new ArrayBuffer(80);
    const view = new DataView(buffer);
    for (let i = 0; i < data.length; i++) {
        view.setUint8(i, data.charCodeAt(i));
    }
    await writable.write(buffer);
}

async function writeUint(data: number, writable: WritableStreamDefaultWriter) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, data, true); // true for little-endian
    await writable.write(buffer);
}

// This Web worker is used to write the states to an Ensight file, this is done for avoiding the collapse/freezing of the main thread.
// which maight block/lag the page and the pc
self.onmessage = async (event) => {
    const { states, statesFileName, stateWildcard, folderHandler } = event.data;

    try {
        //  animation file
        const fileHandler = await folderHandler.getFileHandle(statesFileName + stateWildcard + '.ens', { create: true });
            
        // Create a writable stream
        const writable = await fileHandler.createWritable();
        
        // Write header
        writeString("Ensight Model Post Process", writable);
        writeString("part", writable);
        writeUint(1, writable);
        writeString("coordinates", writable);

        // Write scalar field.
        await writable.write(states);

        // Close file.
        await writable.close();

        // Notify main thread that saving is done
        self.postMessage({ success: true, file: `${statesFileName + stateWildcard}.ens` });

    } catch (error) {
        // Narrow the type of 'error'
        if (error instanceof Error) {
            self.postMessage({ success: false, message: error.message });
        } else {
            self.postMessage({ success: false, message: "An unknown error occurred!" });
        }
    }
};