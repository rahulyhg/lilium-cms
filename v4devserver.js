module.exports = class V4DevServer {
    constructor(_c) {
        this._c = _c;
    }
    start() {
        const _c = this._c;

        if (_c.env != "dev" || !_c.v4devserver || !_c.v4devserver.active) {
            return;
        }

        const Webpack = require('webpack');
        const WebpackDevServer = require('webpack-dev-server');

        const buildconfig = {
            mode : "development",
            module : {
                rules : [
                    { 
                        test : /.m?js$/, 
                        exclude: /(node_modules)/,
                        use : {
                            loader : "babel-loader?cacheDirectory=true", 
                            options : {
                                "plugins": [
                                    ["transform-react-jsx", { "pragma":"h" }],
                                    ["transform-class-properties"],
                                    ["@babel/plugin-proposal-object-rest-spread", {
                                        useBuildIns : true
                                    }],
                                ],
                                "presets" : [
                                    [ "@babel/preset-env" ]
                                ]
                            }
                        }
                    },
                ]
            },
            entry : require('path').join(_c.server.base, 'apps/lilium', 'main.js'),
            plugins: [ ],
            output : {
                filename : "app.bundle.js"
            },
            optimization : {
                runtimeChunk: 'single',
                splitChunks: {
                    cacheGroups: {
                        vendor: {
                            test: /[\\/]node_modules[\\/]/,
                            name: 'vendors',
                            chunks: 'all'
                        },
                        pages : {
                            test: /[\\/]pages[\\/]/,
                            name: 'pages',
                            chunks : 'initial'
                        },
                        layout : {
                            test: /[\\/]layout[\\/]/,
                            name: 'layout',
                            chunks : 'initial'
                        }
                    }
                }
            }
        };

        const compiler = Webpack(buildconfig);

        const server = new WebpackDevServer(compiler, { 
            stats : { 
                colors : true 
            },
            hot : true,
            overlay : true,
            disableHostCheck : true,
            inline: true
        });

        server.listen(_c.v4devserver.port, _c.v4devserver.domain);
    }
}

