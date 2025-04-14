# Cocoro

Cocoro enables fully GPU-resident fast cardiac electrophysiological simulations on the Web through the modern WebGPU standard. 

## Features:

- Tissue and cellular cardiac electrophysiology simulator
- Monodomain model solver
- Finite Difference Method
- Fully GPU-based
- WebGPU-based web application
- Interactive: click-based stimulation, on run time modification of cellular model constants, visualization and integration parameters.
- Automatic computation and rendering of simulation, pseudo-ECGs, cellular state variables
- Ensight binary results for post-processing and visualization on Paraview
- Support 1D (lines), 2D (quads) and 3D (hexahedral) domains.

# Install 

Clone the repo locally on your machine or the machine you will use as server

   ```sh
   cd [/any/parent/folder]
   git clone https://github.com/lino202/cocoro
   ```

A .yml file is provided for generating a conda environment. You can use it or not. If not used you will have to download all dependencies

   ```sh
   cd cocoro
   cd cocoroMain/static/cocoroMain/main/
   npm install
   npm run dev
   ```

Load the server

   ```sh
   cd /path/cocoro
   python manage.py runserver 
   ```

If deployed locally and once the server is loaded you can visit 
- http://localhost:8000/upload for loading the mesh and electrodes positions
- http://localhost:8000/tissue for tissue simulations
- http://localhost:8000/cellular for cellular simulations

# Notes

- Development was mainly performed in Chrome on Windows, but WebGPU support should be arriving to different WebBrowsers under different operative systems (see [WebGPU Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)). 
- Software is written in Python (Django), Typescript, Javascript and WebGPU shading language (WGSL). Django was selected for deploying the entire web application in order to take advantage of python software for mesh processing among others. Typescript is used for hard typed and object oriented development, the typescript code wraps the Javascript one which enabled highlighting the WGSL shader code.
- The main source code of the simulator is under [cocoro/cocoroMain/static/cocoroMain/main/src/](https://github.com/lino202/cocoro/tree/main/cocoroMain/static/cocoroMain/main/src). Any modification of the code here should be recompiled:

   ```sh
   cd [any/path]/cocoro/cocoroMain/static/cocoroMain/main/src/
   npm run dev
   ```

- We use webpack, so take a look at webpack.config.js and tsconfig.json. Moreover, dependencies at the typescript level are manage with npm, so check the package.json.
- WebGPU is evolving rapidly so warnings regarding API modifications can appear on the browser console. You will need to update the src typescript code, as we use webgpu types, you will need to update them in order to be able or recompile without errors, do the following under cocoro/cocoroMain/static/cocoroMain/main/src/: 

  ```sh
    npm i @webgpu/types@0.1.15     # load specific types
    npm i @webgpu/types            # load lastest types
   ```

- Currently, this code is under development [Development](#development)


# Implementation

A thorough description of the implementation and dynamics of this application can be found in our publication [Yet to come]().

# Development

The idea behind this project is to create an open-source, fast but simple, portable GPU-based cardiac simulator for the community to use. It is currently in a proof-of-concept stage so, there are a lot of things to do (please see TODOs through all the source code). In this context, pull-requests, collaborations, issue reports, critics, advice, everything! is welcome :D.

# Examples

Examples are too heavy for being here, so see [Examples](https://unizares-my.sharepoint.com/:f:/g/personal/rrosales_unizar_es/Et6vMDqjG_VNo4-x-rj9d7MBd_7lqlWdXl67HseZ7toHFg).

