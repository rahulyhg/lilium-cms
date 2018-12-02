class LangDico {
    constructor(dictionary, extendedDictionary, datetime) {
        this.dictionary = Object.assign(defaultDictionary, dictionary);
        this.extendedDictionary = extendedDictionary;   
        this.datetime = datetime;
    }

    _v(str) {
        return this.dictionary[str] || `Unknown key ${str}`;
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
