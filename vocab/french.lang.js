import { DefaultDictionary } from './LangDico';
import { h } from 'preact';

const dictionary = {
    
}

const extendedDictionary = { 
    greetUser: username => (<div>Bonjour, <span>{username}</span>.</div>)
}

export class FrenchLanguage extends DefaultDictionary {
    constructor() {
        super(dictionary, extendedDictionary);
    }
}