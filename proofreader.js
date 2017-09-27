const log = require('./log');
const db = require('./includes/db');
const config = require('./config');

const networkinfo = require('./network/info');
const fileserver = require('./fileserver');
const sharedcache = require('./sharedcache');

// Retext plugins
const retext  = require('retext');
const rtDiact = require('retext-diacritics');
const rtRepea = require('retext-repeated-words');
const rtSpell = require('retext-spell');
const rtKeywd = require('retext-keywords');
const rtMenti = require('retext-syntax-mentions');
const rtOveru = require('retext-overuse');
const rtUrlsy = require('retext-syntax-urls');

/*
    Unused Retext plugins

    const rtIndef = require('retext-indefinite-article');
    const rtContr = require('retext-contractions');
    const rtRedun = require('retext-redundant-acronyms');
    const rtSenti = require('retext-sentiment')
*/

const franc = require('franc-min');

const DICTIONARIES = {
    en : require('dictionary-en-ca'),
    fr : require('dictionary-fr')
};

const createRetext = (dico, pdico = "") => {
    // const ignore = pdico.split('\n');
    return retext()
        .use(rtSpell, {
            dictionary : dico,
            normalizeApostrophes : false,
            personal : pdico
        })
        .use(rtMenti)
        .use(rtUrlsy)
        .use(rtDiact)
        // .use(rtKeywd)
        .use(rtRepea);
};

const DICT_PATH = "dictionary";

class Proofreader {
    static getRetext(lang, send) {
        sharedcache.get(DICT_PATH + "_" + lang, pDico => {
            send(createRetext(DICTIONARIES[lang], pDico || ""));
        });
    }

    static francLang(langcode) {
        switch (langcode) {
            case "fra":
                return "fr";

            default:
                return "en";
        }
    }

    proofreadOne(rtx, text, send) {
        const now = Date.now();
        rtx.process(text, (err, report) => {
            log('Proofread', 'Corrected ' + text.length + ' characters in ' + (Date.now() - now) + " ms", 'success');
            send(report);
        });
    }

    proofread(parags, lang, send) {
        const now = Date.now();

        lang = lang || Proofreader.francLang(franc(parags.join(' '), { whitelist : ["eng", "fra"] }));

        Proofreader.getRetext(lang, rtx => {
            const report = new Array(parags.length);
            let i = -1;

            const next = () => {
                if (++i == parags.length) {
                    return send(report);
                }

                this.proofreadOne(rtx, parags[i], (err, singlereport) => {
                    report[i] = singlereport || err;
                    next();
                });
            };

            next();
        });
    }

    addWord(word, lang, done) {
        fileserver.readFile(config.default().server.base + DICT_PATH + "/" + lang, content => {
            content += "\n" + word;
            sharedcache.set({[DICT_PATH + "_" + lang] : content}, () => {
                fileserver.appendToFile(config.default().server.base + DICT_PATH + "/" + lang, "\n" + word, done);
            }); 
        }, false, 'utf8');
    }

    loadDict() {
        fileserver.listDirContent(config.default().server.base + DICT_PATH, (files) => {
            files.forEach(file => {
                fileserver.readFile(config.default().server.base + DICT_PATH + "/" + file, x => {
                    sharedcache.set({
                        [DICT_PATH + "_" + file] : x
                    }, () => {});
                }, false, 'utf8');
            });
        });
    }

    setup() {
        if (networkinfo.isElderChild()) {
            fileserver.createDirIfNotExists(config.default().server.base + DICT_PATH, () => {
                this.loadDict();
            }, true);
        }
    }
}

module.exports = new Proofreader();
