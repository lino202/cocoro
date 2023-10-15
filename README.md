# CarSim

Simulations in the GPU throught the web.


# Usage

For now it is working in chrome on windows only and in my case I have to set msi pc dragon center to use the discrete gpu

# Install 

   ```sh
   cd /parent/folder
   git clone https://github.com/lino202/carSim
   cd carSim
   cd carSimMain/static/carSimMain/main/
   npm install
   npm run prod
   ```

## Load server

   ```sh
   cd /path/carSim
   python manage.py runserver 
   ```

For now the page has to be http://localhost:8000/index and need to be open in a newer Chrome version as this browser supports webGPU


## Typescript

The core of the software is written in Typescript. These code calls the shaders or kernels in WGSL code. All this has to be compiled in the following manner

Go to where the webpack and package.json are which define how the compilation happens for ts files

   ```sh
   cd /path/carSim/carSimMain/static/carSimMain/main/src/
   npm run prod
   ```


We can use the types of for web gpu but the compilation with npm run prod gives erros and the code cannot be compiled. So the warnings regarding updates of webgpu cannot be solved unles new types are used 

  ```sh
    npm i @webgpu/types@0.1.15     # load specific types
    npm i @webgpu/types            # load lastest types
   ```

Those should be used where the packaje.json is...

## Examples

Examples are too heavy for being here, so see 

https://unizares-my.sharepoint.com/:f:/g/personal/rrosales_unizar_es/Et6vMDqjG_VNo4-x-rj9d7MBukCm4th3GA7qA6Zntg-nyg?e=iwdy4H

