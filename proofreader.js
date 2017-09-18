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

/*
    Unused Retext plugins

    const rtOveru = require('retext-overuse');
    const rtIndef = require('retext-indefinite-article');
    const rtContr = require('retext-contractions');
    const rtRedun = require('retext-redundant-acronyms');
    const rtMenti = require('retext-syntax-mentions');
    const rtSenti = require('retext-sentiment')
*/

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
        .use(rtDiact)
        .use(rtKeywd)
        .use(rtRepea);
};

const DICT_PATH = "dictionary";

class Proofreader {
    static getRetext(lang, send) {
        sharedcache.get(DICT_PATH + "_" + lang, pDico => {
            send(createRetext(DICTIONARIES[lang], pDico || ""));
        });
    }

    proofread(text, lang = "en", send) {
        const now = Date.now();
        Proofreader.getRetext(lang, rtx => {
            rtx.process(text, (err, report) => {
                log('Proofread', 'Corrected ' + text.length + ' characters in ' + (Date.now() - now) + " ms", 'success');
                send(report);
            });
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
