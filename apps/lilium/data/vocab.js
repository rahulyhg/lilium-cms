let currentLanguageData;

/**
 * Returns the string of text corresponding to the pageSlug provided for the currentLanguage
 * @param {string} pageSlug string formatted as <pageName>.<slug>
 */
const _v = pageSlug => {
    const [pageName, slug] = pageSlug.split('.');

    if (pageName && slug && currentLanguageData[pageName] && currentLanguageData[pageName][slug]) {
        return currentLanguageData[pageName][slug] || pageSlug;
    } else {
        if (liliumcms.env == 'dev') {
            throw new Error('Invalid pageName or slug provided as argument. the pageSLug argument must be structured as <pageName>.<slug>');
        } else {
            log('Vocab', 'Invalid pageName or slug', 'err');
            return slug;
        }
    }
};

/**
 * Fetches the language data of the specified code and sets it as current language data
 * @param {string} lang Languagecode of the language to display
 */
export const setLanguage = (lang, done) => {
    fetch('/static/compiled/' + lang + '.json')
    .then(r => r.json()).then(data => {
        currentLanguageData = data;
        done && done();
    });
}

/**
 * Subscribes the _v() function in the global scope
 */
export function makeGLobalLang() {
    global._v = _v;
}
