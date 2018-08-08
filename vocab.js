const path = require('path');
const log = require('./log.js');
const {lstatSync, readdirSync, writeFileSync} = require('fs');

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

                    pages.forEach(page => {
                        if (!langData[page]) {
                            langData[page] = {}
                        }
                    });

                    this.languagesData[langName] = langData;

                    writeFileSync(path.join(liliumroot, 'backend', 'static', 'compiled', langDirItem), JSON.stringify(langData));
                } catch (e) {
                    log('Vocab', `Error opening language file ` + e.message, 'err');
                }
            }
        });
        
        log('Vocab', `Detected supported languages ${this.supportedLanguages}`, 'success');
        done && done();
    }

    /**
     * Returns an array containing the language codes of the supported languages
     */
    getSUpportedLanguages() { return this.supportedLanguages; };

    /**
     * Returns an object containing the translation data for a language code
     * @param {string} langcode THe langcode of which to get the translations
     */
    getLangData(langcode) { return this.languagesData[langcode]; }

    /**
     * Writes the language data held in RAM to the disk to ensure consistency after a restart.
     * Also writes the modifications to the /backend/static/compiled directory
     * @param {callback} done 
     */
    writeLangDataToDisk(done) {
        this.supportedLanguages.forEach(lang => {
            writeFileSync(this.getLanguageFilePath(lang), JSON.stringify(this.languagesData[lang], null, 4));
            writeFileSync(path.join(liliumroot, 'backend', 'static', 'compiled', lang + '.json'), JSON.stringify(this.languagesData[lang]));
        });

        done && done();
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
            this.writeLangDataToDisk(done);
        } catch (e) {
            log('Vocab', e, 'err');
            done(e);
        }
    }
    
    /**
     * Updates the name of a slug in a page for each language in the language data
     * and writes it to the disk
     * @param {string} pageName 
     * @param {string} slug 
     * @param {string} newValue 
     * @param {callback} done 
     */
    updateSlugName(pageName, slug, newValue, done) {
        if (slug != newValue) {
            this.supportedLanguages.forEach(lang => {
                const slugValue = this.languagesData[lang][pageName][slug];
                if (slugValue) {
                    this.languagesData[lang][pageName][newValue] = slugValue;
                    delete this.languagesData[lang][pageName][slug];
                } else {
                    this.languagesData[lang][pageName][newValue] = '';                    
                }
            });

            this.writeLangDataToDisk(done);
        } else {
            done && done();
        }
    }

    removeField(pageName, slug, done) {
        this.supportedLanguages.forEach(lang => {   
            delete this.languagesData[lang][pageName][slug];
        });

        this.writeLangDataToDisk(done);
    }

    getPages() {
        return readdirSync(path.join(liliumroot, 'apps', 'lilium', 'pages')).filter(dirItem => {
            return lstatSync(path.join(liliumroot, 'apps','lilium', 'pages', dirItem)).isDirectory();
        });
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

    getDico() {
        return {};
    }
};

module.exports = new Vocab();
