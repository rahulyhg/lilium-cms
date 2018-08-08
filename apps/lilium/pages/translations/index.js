import { h, Component } from "preact";
import{ TextField, ButtonWorker } from '../../widgets/form.js';
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
        if (this.state.field.slug) {
            const lang = name.split('.')[1];
            this.props.onUpdate(this.state.field.slug, lang, val);
        } else {
            log('Translations', "Won't update a field that doesn't have a slug", 'warn');
        }
    }

    render() {
        return (
            <div className="field" style={style.field}>
                <div className="remove-button" onClick={this.props.removeField.bind(this, this.state.field.slug)}>
                    <i className="fa fa-minus"></i>
                </div>
                <TextField name={this.state.field.slug} initialValue={this.state.field.slug} wrapstyle={style.fieldSlug}
                            onChange={(name, value) => {this.props.onSlugNameUpdate(this.state.field.slug, value)}} />
                {
                    Object.keys(this.state.field).map(lang => {
                        return lang != 'slug' && (
                            <TextField name={`${this.state.field.slug}.${lang}`} initialValue={this.state.field[lang]}
                                        wrapstyle={style.langInputWrapper} placeholderType='inside' placeholder={lang}
                                        onChange={this.prepSlugUpdate.bind(this)} onEnter={(value, input) => {this.props.insertAfter(this.state.field.slug, input)}} />
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
     * Inserts a new field in the page after the field having the specified slug
     * @param {string} slug The slug after which to insert
     */
    insertAfter(slug, input) {
        let index = this.state.page.fields.findIndex(f => f.slug == slug);
        if (index != -1) {
            const newVal = { slug: '' };
            this.props.supportedLanguages.forEach(lang => {
                newVal[lang] = '';
            });

            const fields = [...this.state.page.fields.splice(0, index + 1), newVal, ...this.state.page.fields];

            const old = this.state.page;
            old.fields = fields;

            this.setState({ page: old }, () => {
                input.parentElement.parentElement.nextElementSibling.firstElementChild.firstElementChild.focus();
            });
        } else {
            log('Translations', 'Error inserting a new field', 'err');
        }
    }

    /**
     * Updates a language specific string for a slug of a page
     * @param {string} pageName THe name of the page of which to update a slug
     * @param {string} slug The slug to be updated
     * @param {String} lang ISO 639-1 2 letter language code of the language that is being updated
     * @param {string} newValue THe new value
     */
    updateSlug(slug, lang, newValue) {
        alert(lang);
        API.post('/translations/updateLanguageSlug', { pageName: this.props.pageName, slug, lang, newValue }, err => {
            if (!err) {
                log('Translations', `Updated slug ${slug} - ${lang}- ${this.props.pageName} with value ${newValue}`, 'success');
                const page = this.state.page;
                const index = page.fields.findIndex(x => x.slug  == slug);
                page.fields[index][lang] = newValue;
                this.setState({ page });
            } else {
                console.log(err);
                log('Translations', 'Error updating slug', 'err');
            }
        });
    }

    /**
     * 'Upserts' a new slug
     * @param {string} slug 
     * @param {string} newName 
     */
    updateSlugName(slug, newName) {
        alert('updateSLugName');
        API.post('/translations/updateSlugName', { pageName: this.props.pageName, slug, newName }, err => {
            if (!err) {
                log('Translations', 'Updated slug name', 'success');
                const page = this.state.page;
                const index = page.fields.findIndex(x => x.slug  == '');
                page.fields[index].slug = newName;
                this.setState({ page });
            } else {
                log('Translations', 'Error updating slug name', 'err');
            }
        });
    }

    removeField(slug) {
        API.post('/translations/removeField', { pageName: this.props.pageName, slug }, err => {
            if (!err) {
                log('Translations', `Removed slug ${this.props.pageName}.${slug}`, 'success');
                const index = this.state.page.fields.findIndex(x => x.slug == slug);
                if (index != -1) {
                    this.state.page.fields.splice(index, 1);
                    this.setState(this.state);
                }
            } else {
                console.log(err);
            }
        });
    }

    render() {
        return (
            <div className="page-translation" style={style.page}>
                <h2>{this.props.pageName}</h2>
                {
                    this.state.page.fields.map(field => {
                        return (
                            <Field key={`${this.props.pageName}.${field.slug}`} field={field} onUpdate={this.updateSlug.bind(this)}
                                    insertAfter={this.insertAfter.bind(this)} onSlugNameUpdate={this.updateSlugName.bind(this)}
                                    removeField={this.removeField.bind(this)} />
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
                            fields : Object.keys(vocab['en-ca'][page]).map(slug => {
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
                                                supportedLanguages={this.supportedLanguages} />
                            );
                        })
                    }
                </div>
            </div>
        );
    }
}


