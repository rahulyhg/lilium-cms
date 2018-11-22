/**
 * Fetches the language data of the specified code and sets it as current language data
 * @param {string} lang Languagecode of the language to display
 */
export const setLanguage = (lang, done) => {
    const languageFileName = lang + '.bundle.js';
    fetch('/static/compiled/' + languageFileName)
    .then(r => r.text()).then(js => {

        // EVAL DANGER ZONE //////
        /**/     eval(js)     /**/
        //////////////////////////

        const langInstance = new LiliumLanguage[Object.keys(LiliumLanguage)[0]]();
        global._v = langInstance._v.bind(langInstance);
        global._ev = langInstance._ev.bind(langInstance);

        // Create new execution context because Prmises are ridiculous
        setTimeout(() => done && done(), 0);
    })
    .catch(err => {
        log('Vocab', 'Failed to load vocab file : ' + lang, 'err');
        console.log(err);
        throw 'Could not get language file ' + languageFileName;
    });
}
