class LangDico {
    constructor(dictionary, extendedDictionary) {
        this.dictionary = Object.assign(defaultDictionary, dictionary);
        this.extendedDictionary = extendedDictionary;        
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

}

export class DefaultDictionary extends LangDico {
    constructor(dictionary, extendedDictionary) {
        super(dictionary, extendedDictionary);
    }
}
