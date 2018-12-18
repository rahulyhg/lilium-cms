var nodeExternals = require('webpack-node-externals');

const buildconfig = {
    mode : "production",
    target : 'node',
    externals : [nodeExternals()],
    module : {
        rules : [
            { 
                test : /(.js|.lml3?)$/, 
                exclude: /(node_modules)/,
            },
        ]
    },
    entry : require('path').join(__dirname, 'index.prod.js'),
    plugins: [ ],
    output : {
        path : __dirname,
        filename : "liliumv4.bundle.js"
    }
};

module.exports = buildconfig;
