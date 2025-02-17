class MouseStimHandler {
    isDragging: boolean;
    x: number;
    y: number;

    constructor(canvas: HTMLCanvasElement) {
        this.isDragging = false;
        this.x = 0;
        this.y = 0;

        canvas.addEventListener('mousedown', (event) => {
            if (event.ctrlKey && event.button === 0) {
                this.isDragging = true;
                this.handleMouseClicked(event);
            }
        });

        canvas.addEventListener('mousemove', (event) => {
            if (this.isDragging) {
                this.handleMouseClicked(event);
            }
        });

        canvas.addEventListener('mouseup', (event) => {
            if (this.isDragging) {
                this.isDragging = false;
            }
        });
    }

    handleMouseClicked(event: MouseEvent) {
        this.x = event.clientX;
        this.y = event.clientY;
        console.log(this.x, this.y);
    }
}

export default MouseStimHandler;