const path = require('path');
const log = require('./log.js');
const {lstatSync, readdirSync, writeFileSync} = require('fs');
const _c = require('./config');
const wp = require('webpack');

class Vocab {

    constructor() {
        this.languagesData = {};
        this.supportedLanguages = [];
        this.defaultLanguage = 'en-ca';
    }

    /**
     * Initializes language JSON files that will be requested by clients
     * @param {callback} done 
     */
    preloadDicos(done) {
        const pages = this.getPages();

        readdirSync(path.join(liliumroot, 'vocab')).filter(dirName => dirName.endsWith('.js')).forEach(langDirItem => {
            log('Vocab', 'Reading vocab file ' + langDirItem, 'info');
            

        });

        log('Vocab', `Detected supported languages ${this.supportedLanguages}`, 'success');
        done && done();
    }

    compile() {
        
    }
}



module.exports = new Vocab();
