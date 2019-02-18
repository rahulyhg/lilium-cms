const path = require('path');

const { readdir, readdirSync, writeFileSync } = require('fs');
const _c = require('./config');
const webpack = require('webpack');

function compileVocabFile(lang, done) {
    const buildconfig = {
        mode : "production",
        module : {
            rules : [
                {
                    test : /.js$/,
                    exclude: /(node_modules)/,
                    use : {
                        loader : "babel-loader",
                        options : {
                            "plugins": [
                                ["transform-react-jsx", { "pragma":"h" }],
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
        entry : path.join(liliumroot, 'vocab', lang),
        plugins: [],
        output : {
            library : "LiliumLanguage",
            libraryTarget : "window",
            path : path.join(liliumroot, 'backend', 'static', 'compiled'),
            filename : lang.split('.')[0] + ".bundle.js"
        }
    };

    webpack(buildconfig, (err, result) => {
        done && done(err);
    });
}

class Vocab {
    constructor() {
        this.supportedLanguages = [];
    }

    preloadDicos(done) {
        const languagesToCompile = readdirSync('./vocab').filter(x => x.endsWith('.lang.js'));
        this.supportedLanguages =languagesToCompile.map(l => l.split('.lang.js')[0]);

        let langIndex = -1;

        const nextLanguage = () => {
            const lang = languagesToCompile[++langIndex];
            if (!lang) {
                return done();
            }

            compileVocabFile(lang, err => {
                if (err) {
                    log('Vocab', "Error during language webpack bundle", 'err');
                    console.log(err);
                }

                log('Vocab', `Compiled JS bundle for language ${lang}`, 'info');
                nextLanguage();
            });
        }

        nextLanguage();
    }

    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    adminPOST(cli) {
        if (cli.routeinfo.path[2] == "builddico" && cli.hasRight('admin')) {
            this.preloadDicos(err => {
                cli.sendJSON({ err, success : !err })
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }
};

module.exports = new Vocab();
