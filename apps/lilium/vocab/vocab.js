const SUPPORTED_LANGUAGES = [
    'en', 'fr', 'sp'
];

exports.getSupportedLanguages = () => {
    return SUPPORTED_LANGUAGES;
}

/**
 * Fetches the language resource file from the server that corresponds to the specified language code.
 * @param {string} langCode ISO 639-1 2 letter language code
 */
exports.setLanguage = (langCode, done) => {
    fetch(`/vocab/${langCode}.json`)
    .then(function(response) {
        return response.json();
    })
    .then(function(myJson) {
        console.log(myJson);
    });    
}


