# CarSim

Simulations in the GPU throught the web.


# Usage 


## Load server

   ```sh
   cd /path/carSim
   python manager.py runserver 
   ```

For now the page has to be http://localhost:8000/index and need to be open in Chrome Canary as this is browser supporting webGPU


## Typescript

The core of the software is written in Typescript. These code calls the shaders or kernels in WGSL code. All this has to be compiled in the following manner

Go to where the webpack and package.json are which define how the compilation happens for ts files

   ```sh
   cd /path/carSim/carSimRender/static/carSimRender/main/src/
   npm run prod
   ```


We can use the types of for web gpu but the compilation with npm run prod gives erros and the code cannot be compiled. So the warnings regarding updates of webgpu cannot be solved unles new types are used 

  ```sh
    npm i @webgpu/types@0.1.15     # load specific types
    npm i @webgpu/types            # load lastest types
   ```

Those should be used where the packaje.json is...

Today the warnings are only [warnings](./images/problems_28_11_22.PNG) but the new realease of 1.23 of types has to be used in the near future.


