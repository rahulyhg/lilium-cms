class LangDico {
    constructor(dictionary, extendedDictionary, datetime) {
        this.dictionary = Object.assign(defaultDictionary, dictionary);
        this.extendedDictionary = extendedDictionary;   
        this.datetime = datetime;
    }

    _v(str) {
        const levels = str.split('.');
        if (levels.length == 1) return this.dictionary[str] || log('Vocab', `Unknown key ${str}, 'warn)`);

        // Allow dynamic access with dot notation
        return levels.reduce((prev, curr) => {
            return prev ? prev[curr] : null
        }, this.dictionary) || 'Unknown dot notation key';
    }

    _ev(str, ...args) {
        return this.extendedDictionary[str] ? 
            this.extendedDictionary[str](...args) : 
            `Unknown key ${str}`;
    }
}

const defaultDictionary = {
    save: 'save',
    cancel: 'Cancel',
    edit: 'edit',
    dashboard: 'Dashboard',

    // Preferences
    preferencesTitle: 'Preferences',
    
}

export class DefaultDictionary extends LangDico {
    constructor(dictionary, extendedDictionary, datetime) {
        super(dictionary, extendedDictionary, datetime);
    }
}
