const log = require('./log');
const db = require('./includes/db');

const retext = require('retext');
const rtContr = require('retext-contractions');
const rtDiact = require('retext-diacritics');
const rtIndef = require('retext-indefinite-article');
const rtRedun = require('retext-redundant-acronyms');
const rtRepea = require('retext-repeated-words');
const rtSpell = require('retext-spell');
const rtMenti = require('retext-syntax-mentions');
const rtSenti = require('retext-sentiment')

const dico = {
    en : require('dictionary-en-ca'),
    fr : require('dictionary-fr')
};

class Proofreader {
    proofread(text, lang, send) {
        const now = Date.now();
        retext().use(rtSpell, dico[lang]).use(rtContr)
            .use(rtDiact).use(rtIndef).use(rtRedun)
            .use(rtRepea).use(rtMenti).use(rtSenti)
            .process(text, (err, report) => {
                log('Proofread', 'Corrected ' + text.length + ' characters in ' + (Date.now() - now) + " ms", 'success');
                send(report);
            }
        );
    }
}

module.exports = new Proofreader();
