const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: './src/index.ts',

    output: {
        clean: true,
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.umd.js',
        library: { name: 'HyperliquidSdk', type: 'umd' },
    },

    plugins: [new NodePolyfillPlugin()],

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },

    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};