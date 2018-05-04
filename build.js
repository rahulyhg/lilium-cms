const fs = require('fs');
const path = require('path');
const Babel = require("babel-core");
const sharedcache = require('./sharedcache');
const webpack = require('webpack');

const init_build_tree = [];

class Builder {
    static get defaultOptions() {
        return { 
            babel : { "presets": ["env"] },
            bundlename : "app.bundle.js"
        };
    }

    pushToBuildTree(_c, input, outputkey, options) {
        log('Builder', 'Added file ' + input + ' to build tree', 'detail');
        init_build_tree.push({ _c, input, outputkey, options });
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
        log('Builder', 'Compiling ES6 project from dir ' + input, 'info');
        const now = Date.now();
        options = options || Builder.defaultOptions;

        const buildconfig = {
            module : {
                rules : [
                    { 
                        test : /.jsx?$/, 
                        loader : "babel-loader", 
                        options : options.babel 
                    },
                ]
            },
            entry : path.join(liliumroot, "apps", input, 'main.js'),
            output : {
                path : options.outputpath || (_c.server.html + "/apps/" + outputkey),
                filename : options.bundlename || "app.bundle.js"
            }
        };

        webpack(buildconfig, (err, result) => {
            if (err) { throw err; }
            log('Builder', 'Compiled ES6 file with key ' + outputkey + " in " + (Date.now() - now) + "ms", 'success');
            done && done();
        });
    }

    getBundle(siteid, outputkey, sendback) {
        sharedcache.get('_babel_' + siteid + "_" + outputkey, markup => {
            sendback(markup);
        });
    }
};

module.exports = new Builder();
