const fs = require('fs');
const path = require('path');
const Babel = require("babel-core");
const webpack = require('webpack');
const hooks = require('../lib/hooks');

const init_build_tree = [];
const WEBPACK_CACHE = {};

class Builder {
    static get defaultOptions() {
        return { 
            babel : { "presets": ["env"] },
            bundlename : "app.bundle.js"
        };
    }

    pushToBuildTree(_c, input, outputkey, options) {
        log('Builder', 'Added file ' + input + ' to build tree', 'detail');
        const entry = { _c, input, outputkey, options }
        init_build_tree.push(entry);

        hooks.fireSite(_c, 'addedFileToBuildTree', entry)
    }

    initialBuild(done) {
        log('Builder', 'Running initial build', 'info');
        let index = -1;
        let next = () => {
            const buildopt = init_build_tree[++index];
            if (buildopt) {
                this.build(buildopt._c, buildopt.input, buildopt.outputkey, buildopt.options, () => next());
            } else {
                done();
            }
        };

        next();
    }

    build(_c, input, outputkey, options, done) {
        const now = Date.now();
        options = options || Builder.defaultOptions;

        const entryfile = path.join(liliumroot, "apps", input, options.entryfile || 'main.js');        
        const precompfile = path.join(liliumroot, "apps", input, 'main.lilium.js');

        if (options.dontOverwite) {
            try {
                fs.statSync(path.join(options.outputpath || (_c.server.html + "/apps/" + outputkey), options.bundlename || "app.bundle.js"));
                log('Builder', 'Will not build Preact project ' + input + ' because it already exists', 'info');
                return done && done();
            } catch (err) { }
        }

        log('Builder', 'Compiling ES6 project from dir ' + input, 'info');

        const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
        
        const buildconfig = {
            mode : _c.env == "dev" ? "development" : "production",
            // externals: [nodeExternals()],
            module : {
                rules : [
                    { 
                        test : /.m?js$/, 
                        exclude: /(node_modules)/,
                        use : [{
                            loader : "babel-loader?cacheDirectory=true", 
                            options : options.babel 
                        }]
                    },
                ]
            },
            entry : entryfile,
            plugins: [],
            output : {
                path : options.outputpath || (_c.server.html + "/apps/" + outputkey),
                filename : options.bundlename || "[name].bundle.js"
            },
            resolve : {
                modules : options.resolve || [
                    path.resolve(path.join(liliumroot, 'apps', 'lilium')),
                    path.resolve(path.join(liliumroot, 'node_modules'))
                ]
            },
            optimization : {
                runtimeChunk: 'single',
                splitChunks: {
                    cacheGroups: {
                        preact: {
                            name: 'preact',
                            chunks: 'all',
                            minSize: 0,
                            test: /[\\/]preact[\\/]/,
                            priority: 99,
                        },
                    }
                },
                minimizer: [
                    new UglifyJsPlugin({
                        include: /preact\.js$/,
                        uglifyOptions: {
                            compress: {
                                reduce_funcs: false,
                            },
                        },
                    }),
                    new UglifyJsPlugin({
                        exclude: /preact\.js$/,
                        cache: true,
                        parallel: true,
                    })
                ],
            }
        };

        webpack(buildconfig, (err, result) => {
            err ? log('Builder', 'Error compiling project ' + outputkey + ' : ' + err, 'err') : 
                log('Builder', 'Compiled ES6 file with key ' + outputkey + " in " + (Date.now() - now) + "ms", 'success');

            if (result && result.compilation && result.compilation.errors.length != 0) {
                log('Builder', 'Errors were found in the code for ' + outputkey, 'err');
                result.compilation.errors.forEach(console.log);
            }

            done && done(err, result);
        });
    }

    getAppScript(key) {
        return `<div id="${key}-app"></div>
        <script>
            log('Preact', 'Waiting for LMLDom to be ready before requesting bundle ${key}');
            liliumcms.lmldom.bind(function() {
                log('Preact', 'Getting Preact script with key ${key}');
                liliumcms.lmldom.get('/apps/${key}/app.bundle.js', {}, function(preactscript) {
                    log('Preact', 'Evaluating bundle for app ${key}');
                    eval(preactscript);
                    log('Preact', 'Evaluated bundle for app ${key}');
                });
            });
        </script>`;
    }

    getBundle(siteid, outputkey, sendback) {
        require('../lib/sharedcache').get('_babel_' + siteid + "_" + outputkey, markup => {
            sendback(markup);
        });
    }
};

module.exports = new Builder();
