

class LangDico {
    constructor(lang, vocab, extendedVocab) {
        this.vocab = vocab;
        this.extVocab = extendedVocab;
    }

    _v(key) {
        return this.vocab[key];
    }

    _ev(key) {
        return this.extVocab[key];
    }
}

const vocab = {
    dashboad: 'hello'
}

const extVocab = {
    greeting: user => `Hello, ${user.disp}`
}

class LangENCA extends LangDico {
    constructor() {
        super('en-ca0', vocab, extVocab);

    }
}


