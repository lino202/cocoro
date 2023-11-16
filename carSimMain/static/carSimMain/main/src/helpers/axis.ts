



export const initCanvas = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;


  const ctx2d = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  if (ctx2d) {
    ctx2d.font = "14px Courier New";
    // ctx2d.fillStyle = "white";
    // ctx2d.strokeStyle = "white";
  }
  return ctx2d;

};



export const setX = (
    ctx2d: CanvasRenderingContext2D,
    width: number,
    height: number,
    min: number,
    max: number,
    divs: number
  ) => {
    ctx2d.clearRect(0, 0, width, height);
    var step = (max - min) / divs;
    for (let i = 0; i <= divs; i++) {
      const midpoint = i * step;
      const x = width - ((i / divs) * width);
  
        if (i==0){
          ctx2d.textAlign = "right";
        }else if (i==divs){
          ctx2d.textAlign = "left";
        }else{
          ctx2d.textAlign = "center";
        }
      
      ctx2d.fillText(`t-${Number.parseFloat(midpoint.toString()).toFixed(1)}`, x, 26);
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, 10);
      ctx2d.textBaseline = "bottom";
      ctx2d.stroke();
    }
  };


  
export const setY = (
  ctx2d: CanvasRenderingContext2D,
  width: number,
  height: number,
  min: number,
  max: number,
  divs: number
) => {
  //console.log("yaxis->", canvasSize);
  ctx2d.clearRect(0, 0, width, height);
  var step = (max - min) / divs;
  for (let i = 0; i <= divs; i++) {
    const midpoint = max - (i * step);
    const y = (i / divs) * height;

    if (i==0){
      ctx2d.textBaseline = "top";
    }else if (i==divs){
      ctx2d.textBaseline = "bottom";
    }else{
      ctx2d.textBaseline = "middle";
    }
    
    ctx2d.fillText(`${Number.parseFloat(midpoint.toString()).toFixed(2)}`, 0, y, width);
    ctx2d.textAlign = "left";
    ctx2d.moveTo(width - 10, y);
    ctx2d.lineTo(width, y);
    ctx2d.stroke();
  }
};

// export const updateAxisX = (scale: number, offset: number, divs: number): void => {
//   //console.log("axis->", axis == "y");
//   //console.log("axis->", midpoint);
//   if (ctxX) {
//     updateX(ctxX, canvasX.width, canvasX.height, scale, offset, divs);
//   }
// };

// export const updateAxisY = (scale: number, offset: number, divs: number): void => {
//   if (ctxY) {
//     updateY(ctxY, canvasY.width, canvasY.height, scale, offset, divs);
//   }
// };