const _c = require('./config.js');
const dicos = {};
const path = require('path');
const log = require('./log.js');
const {lstatSync, readdirSync, writeFile, writeFileSync} = require('fs');

class Vocab {

    constructor() {
        this.supportedLanguages = [];
        this.languagesData = {};
    }

    /**
     * Converts the multilingual data sotred in the 'masterVocab' file into language specific files
     * that can then be fetched by a client accordfring to it's prefered language
     * @param {callback} done 
     */
    preloadDicos(done) {
        const pages = readdirSync(path.join(liliumroot, 'apps', 'lilium', 'pages')).filter(dirItem => {
            return lstatSync(path.join(liliumroot, 'apps','lilium', 'pages', dirItem)).isDirectory();
        });

        readdirSync(path.join(liliumroot, 'vocab')).forEach(langDirItem => {
            if (langDirItem.endsWith('.json')) {
                const langName = langDirItem.split('.json')[0];
                this.supportedLanguages.push(langName);

                try {
                    const langData = require(path.join(liliumroot, 'vocab', langDirItem)) || {};

                    console.log(pages);
                    pages.forEach(page => {
                        if (!langData[page]) {
                            langData[page] = {}
                        }
                    });

                    this.languagesData[langName.replace('-', '')] = langData;

                    console.log(langData);
                    console.log(this.languagesData);
                    console.log(this.supportedLanguages);

                    writeFileSync(path.join(liliumroot, 'vocab', langDirItem), JSON.stringify(langData, null, 4));
                } catch (e) {
                    log('Vocab', `Error opening language file ` + e.message, 'err');
                }
            }
        });
        
        done && done();
        log('Vocab', `Detected supported languages ${this.supportedLanguages}`, 'success');
    }

    /**
     * Returns an array containing the language codes of the supported languages
     */
    getSUpportedLanguages() { return this.supportedLanguages; }

    /**
     * Returns an object containing the translation data for a language code
     * @param {string} langcode THe langcode of which to get the translations
     */
    getLangData(langcode) {
        return this.languagesData[langcode.replace('-', '')];
    }

    /**
     * Updates a page translation slug for a specific language
     * @param {string} lang Language code
     * @param {string} pageName Name of the page in which to perform the update
     * @param {string} slug THe slug to update
     * @param {string} value New value of the slug
     * @param {callback} done
     */
    updateSlug(lang, pageName, slug, value, done) {
        try {
            this.languagesData[lang][pageName][slug] = value;
            writeFile(getLanguageFilePath(lang), JSON.stringify(this.languagesData[lang], null, 4), err => {
                done && done(err);
            });
        } catch (e) {
            throw new Error('Tried to update a slug for an invalid language or page');
        }
    }

    getPages() {
        return readdirSync(path.join(liliumroot, 'apps', 'lilium', 'pages')).filter(dirItem => {
            return lstatSync(path.join(liliumroot, 'apps','lilium', 'pages', dirItem)).isDirectory();
        });
    }

    getDico() {
        return {};
    }

    getAllLanguageResources() {
        return this.languagesData;
    }

    /**
     * Returns the absolute path of a language file
     * @param {string} langcode Language code of the language file to get
     */
    getLanguageFilePath(langcode) {
        return path.join(liliumroot, 'vocab', langcode+ '.json');
    }
};

module.exports = new Vocab();
