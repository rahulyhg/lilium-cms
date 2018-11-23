import { DefaultDictionary } from './LangDico';
import { h } from 'preact';

const dictionary = {
    
}

const extendedDictionary = { 
    greetUser: username => (<div>Hi, <span>{username}</span>.</div>)
}

export class EnglishLanguage extends DefaultDictionary {
    constructor() {
        super(dictionary, extendedDictionary);
    }
}