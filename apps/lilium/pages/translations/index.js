import { h, Component } from "preact";
import  { setPageCommands } from '../../layout/lys.js';
import { getSupportedLanguages } from '../../vocab/vocab.js';
import{ TextField, EditableText } from '../../widgets/form.js';
import API from '../../data/api';

const style = {
    field: {
        marginLeft: '25px',
        display: 'flex',
        flexFlow: 'row nowrap'
    },
    fieldSlug: {
        fontWeight: 'bold',
        alignSelf: 'center',
        flex: '0 0 200px',
        margin: '0px',
        marginLeft: '0px'
    },
    page: {
        margin: '0px 25px'
    },
    langInputWrapper: {
        alignSelf: 'center',
        flexGrow: '1',
        margin: '2px 8px'
    }
};

class Field extends Component {
    constructor(props) {
        super(props);

        this.state = {
            field: this.props.field,
        }
    }

    prepSlugUpdate(name, val) {
        alert('Preping slug update');
        const lang = name.split('-')[1];
        this.props.onUpdate(this.state.field.slug, lang, val);
    }

    updateSlugName(name, val) {
        alert('Changing slug name' + name + ' ' + val);
    }

    render() {
        return (
            <div className="field" style={style.field}>
                
                <TextField name={this.state.field.slug} initialValue={this.state.field.slug} onChange={this.updateSlugName.bind(this)} wrapstyle={style.fieldSlug} />
                {
                    Object.keys(this.state.field).map(lang => {
                        return lang != 'slug' && (
                            <TextField name={`${this.state.field.slug}-${lang}`} initialValue={this.state.field[lang]}
                                        wrapstyle={style.langInputWrapper} placeholderType='inside' placeholder={lang}
                                        onChange={this.prepSlugUpdate.bind(this)} onEnter={this.props.insertAfter.bind(this)} />
                        )
                    })
                }
            </div>
        );
    }
}

class PageTranslation extends Component {
    constructor(props) {
        super(props);

        this.state = {
            page: this.props.page
        };
    }
    
    /**
     * Recieves the slug, lang and newValue from the field that is to be updated and adds
     * the page name to the payload before finally calling the mathod the will update the slug
     */
    proxySlugUpdate(slug, lang, newValue) {
        alert('Proxy ' + slug + lang + newValue);
        this.props.onUpdate(this.state.page.name, slug, lang, newValue);
    }

    insertAfter(slug) {
        alert('insert after');
        let index = this.state.page.fields.findIndex(f => f.slug == slug);
        if (index != -1) {
            const newVal = { slug:'' };
            this.props.supportedLanguages.forEach(lang => {
                newVal[lang] = '';
            });
            const fields = [...this.state.page.fields.splice(0, index + 1), newVal, ...this.state.page.fields];

            const old = this.state.page;
            old.fields = fields;

            this.setState({ page: old });
        }
    }

    render() {
        return (
            <div className="page-translation" style={style.page}>
                <h2>{this.props.pageName}</h2>
                {
                    this.state.page.fields.map(field => {
                        return (
                            <Field field={field} onUpdate={this.proxySlugUpdate.bind(this)} insertAfter={this.insertAfter.bind(this)} />
                        );
                    })
                }
            </div>
        );
    }
}

export default class Translations extends Component {
    constructor(props) {
        super(props);

        this.supportedLanguages = [];
        this.state = {
            pagesTranslations: {}
        };
    }

    /**
     * Updates a language specific string for a slug of a page
     * @param {string} pageName THe name of the page of which to update a slug
     * @param {string} slug The slug to be updated
     * @param {String} lang ISO 639-1 2 letter language code of the language that is being updated
     * @param {string} newValue THe new value
     */
    updateSlug(pageName, slug, lang, newValue) {
        API.post('/translations/updateLanguageSlug', { pageName, slug, lang, newValue }, (err, data) => {
            if (!err) {
                alert('updated slug!');
            }
        });
    }

    getSupportedLanguages(done) {
        API.get('/translations/getSupportedLanguages', {}, (err, data) => {
            if (!err) {
                done && done(data);
            } else {
                log('Translations', 'Failed to get supported languages', 'err');
                console.log(err);
            }
        });
    }

    getPages(done) {
        API.get('/translations/getPages', {}, (err, data) => {
            if (!err) {
                done && done(data);
            }
        });
    }
    
    getLangResources(done) {
        API.get('/translations/getAllLanguageResources', {}, (err, languageResources) => {
            if (!err) {
                console.log(languageResources);
                done && done(languageResources);
            } else {
                console.log(err);
            }
        });        
    }

    componentDidMount() {
        this.getSupportedLanguages(supportedLanguages => {
            this.supportedLanguages = supportedLanguages;
        });

        this.getMappedLangData(mapped => {
            this.setState({ pagesTranslations: mapped });
            console.log('state', this.state);
        });
    }

    /**
     * Gets the multilingual data and remaps it for it to be edited
     * @param {callback} done 
     */
    getMappedLangData(done) {
        // What will be returned 
        const mapped = {};
        this.getPages(pages => {
            this.getLangResources(vocab => {
                console.log('Vocab', vocab);
                // For each page keys, we will assign a single field named "fields" which is an array 
                try {
                    pages.forEach(page => {
                        mapped[page] = {
                            fields : Object.keys(vocab.enca[page]).map(slug => {
                                // We map on the current page slugs (i.e. title, subtitle, profileHeader)
                                const perLang = {slug};
        
                                // For each language we support, find the translation per slug
                                Object.keys(vocab).forEach(lang => {
                                    perLang[lang] = vocab[lang][page][slug];
                                });
        
                                // Set slug, spread all languages into one final object to be added in "fields" array or current page
                                return perLang;
                            })
                        };
                    });
        
                    done && done(mapped);
                } catch (e) {
                    log('Translations', 'Error mapping language data : ' + e, 'err');
                }
            });
        });
    }

    render() {
        return (
            <div id="translations">
                <h1>Translations</h1>
                <div id="pages">
                    <div id="headers" style={Object.assign({}, style.field, { marginLeft: '50px' })}>
                        <h4 style={style.fieldSlug}>Slug</h4>
                        {
                            this.supportedLanguages.map(language => {
                                return (<h4 style={style.langInputWrapper}>{language}</h4>)
                            })
                        }
                    </div>
                    {
                        Object.keys(this.state.pagesTranslations).map(pageName => {
                            console.log(pageName);
                            return (
                                <PageTranslation pageName={pageName} page={this.state.pagesTranslations[pageName]}
                                                supportedLanguages={this.supportedLanguages} onUpdate={this.updateSlug} />
                            );
                        })
                    }
                </div>
            </div>
        );
    }
}


