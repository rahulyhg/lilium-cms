const path = require('path');
const log = require('./log.js');
const {lstatSync, readdirSync, writeFileSync} = require('fs');
const _c = require('./config');

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

        readdirSync(path.join(liliumroot, 'vocab')).forEach(langDirItem => {
            log('Vocab', 'Reading vocab file ' + langDirItem, 'info');
            if (langDirItem.endsWith('.json')) {
                try {
                    const langData = require(path.join(liliumroot, 'vocab', langDirItem)) || {};
                    this.supportedLanguages.push(langData.__);

                    pages.forEach(page => {
                        if (!langData[page]) {
                            langData[page] = { title: page };
                            log('Vocab', 'Added new page to translations ' + page, 'info');
                        }
                    });


                    this.languagesData[langData.__.languageName] = langData;
                    console.log('BEFORE WRITE: ', this.languagesData);
                    
                    writeFileSync(path.join(liliumroot, 'backend', 'static', 'compiled', langDirItem),
                                    JSON.stringify(this.compileLanguageData(langData.__.languageName)));              
                    console.log('AFTER WRITE: ', this.languagesData);
                          
                } catch (e) {
                    console.log(e);
                    log('Vocab', `Error opening language file ` + e.message, 'err');
                }
            }
        });

        console.log('FINAL LANGUAGES DATA: ', this.languagesData);

        log('Vocab', `Detected supported languages ${this.supportedLanguages}`, 'success');
        done && done();
    }

    /**
     * Returns an array containing the information for all supported languages
     */
    getSUpportedLanguages() { return this.supportedLanguages; }

    /**
     * Returns an array containing the language codes of the supported languages
     */
    getSupportedLanguageCodes() {
        return this.supportedLanguages.map(l => l.languageName);
    }

    /**jsvas
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
        this.getSupportedLanguageCodes().forEach(lang => {
            writeFileSync(this.getLanguageFilePath(lang), JSON.stringify(this.languagesData[lang], null, 4));
            writeFileSync(path.join(liliumroot, 'backend', 'static', 'compiled', lang + '.json'), JSON.stringify(this.compileLanguageData(lang)));
        });

        log('Vocab', 'Writing language translations to disk', 'info');
        done && done();
    }

    /**
     * Returned a compiled version of the language data that will be served as a static asset.
     * This compilation logic handles the following fallback mechanisms:
     *  - If a culture specific language e.g. 'fr-fr'does not have text associated to it, it will fallback to
     *    any same language culture e.g. 'fr-ca' that has text associated to it.
     *  - If no suitable language could be found in the previous step, fallback to 'en-ca'
     * It's necessary to compile the language data as such to avoid having to fetch multiple language resource files from the client side
     * @param {string} lang The language code of the language file to compile
     */
    compileLanguageData(lang) {
        console.log('============================');
        console.log('COMPILING LANGUAGE DATA FOR LANGUAGE : ',lang);
        
        const compiled = {...this.languagesData[this.defaultLanguage]};
        const fallbackLangData = this.languagesData[this.languagesData[lang].__.fallback] || this.languagesData[lang];
        
        this.getPages().forEach(page => {
            Object.keys(fallbackLangData[page]).filter(slug => fallbackLangData[page][slug]).forEach(slug => {
                compiled[page][slug] = fallbackLangData[page][slug];
            });
            Object.keys(this.languagesData[lang][page]).filter(slug => this.languagesData[lang][page][slug]).forEach(slug => {
                compiled[page][slug] = this.languagesData[lang][page][slug];
            }); 
        });

        log('Vocab', 'Compiled language resource file for language ' + lang, 'info');
        compiled.__ = this.languagesData[lang].__;

        return compiled;
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
            log('Vocab', `Set language slug ${slug} in page ${pageName} for language ${lang} to '${value}'`, 'success');
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
            this.supportedLanguages.map(l => l.languageName).forEach(lang => {
                const slugValue = this.languagesData[lang][pageName][slug];
                if (slugValue) {
                    this.languagesData[lang][pageName][newValue] = slugValue;
                    delete this.languagesData[lang][pageName][slug];
                } else {
                    this.languagesData[lang][pageName][newValue] = '';                    
                }
            });

            log('Vocab', `Updated language slug name Lowein page ${pageName} from '${slug}' to '${newValue}'`, 'success');
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
};

module.exports = new Vocab();
