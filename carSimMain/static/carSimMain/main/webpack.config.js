const path = require("path");
const bundleOutputDir = "./dist";

module.exports = {
    entry: {
        main_tissue:   "./src/main_tissue",
        main_cellular: "./src/main_cellular",
        main_heat:     "./src/main_heat",
        main_render:   "./src/main_render"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.join(__dirname, bundleOutputDir),
        publicPath: 'public/dist/'
    },
    devtool: "source-map",
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: ['/node_modules/']
            },            
            { test: /\.tsx?$/, loader: "ts-loader" },        
            {
                test: /\.css$/,
                sideEffects: true,
                loader: "css-loader"
            },
            {
                test: /\.(wgsl|glsl|vs|fs)$/,
                loader: 'ts-shader-loader'
            }
        ]
    }
};