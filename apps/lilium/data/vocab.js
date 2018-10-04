import { castNotification } from '../layout/notifications';

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
            castNotification({
                type: 'err',
                title: 'Invalid translations Slug or pageName',
                message: 'Invalid translation Slug or pageName provided as argument to _v()'
            });

            return 'Invalid translations Slug or pageName ' + pageSlug;
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
    })
    .catch(err => {
        log('Vocab', 'Failed to load vocab file : ' + lang, 'err');
        done && done();
    });
}

/**
 * Subscribes the _v() function in the global scope
 */
export function makeGLobalLang() {
    global._v = _v;
}
