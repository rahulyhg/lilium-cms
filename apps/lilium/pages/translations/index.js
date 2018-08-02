import { h, Component } from "preact";
import  { setPageCommands } from '../../layout/lys.js';
import { getSupportedLanguages } from '../../vocab/vocab.js';
import{ TextField } from '../../widgets/form.js';
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
        flex: '1',
        margin: '2px 8px'
    }
};

class Field extends Component {
    constructor(props) {
        super(props);

        this.state = {
            field: this.props.field
        }
    }

    prepSlugUpdate(name, val) {
        alert('Preping slug update');
        const lang = name.split('-')[1];
        this.props.onUpdate(this.state.field.slug, lang, val);
    }

    render() {
        return (
            <div className="field" style={style.field}>
                <p className="slug" style={style.fieldSlug} title={this.state.field.slug}>{this.state.field.slug}</p>
                {
                    getSupportedLanguages().map(lang => {
                        return (
                            <TextField type="text" name={`${this.state.field.slug}-${lang}`} initialValue={this.state.field[lang]}
                                        wrapstyle={style.langInputWrapper} placeholderType='inside' placeholder={lang}
                                        onChange={this.prepSlugUpdate.bind(this)} />
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

    render() {
        return (
            <div className="page-translation" style={style.page}>
                <h2>{this.state.page.name}</h2>
                {
                    this.state.page.fields.map(field => {
                        return (
                            <Field field={field} onUpdate={this.proxySlugUpdate.bind(this)} />
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

        this.state = {
            pagesTranslations: []
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
        alert('Updating slug ' + pageName + slug + lang + newValue);
        // API.post('/updateLanguageSlug', { pageName, slug, lang, newValue }, (err, data) => {
        //     if (!err) {
        //         alert('updated slug!');
        //     }
        // });
    }

    rebuildTranslations() {
        log('Vocab','Rebuilding translations', 'info');
    }

    componentDidMount() {
        setPageCommands([
            {
                command : "translation-rebuild",
                displayname : "Rebuild Translations",
                execute : this.rebuildTranslations.bind(this)
            }
        ]);

        this.setState({
            pagesTranslations: [
                {
                    name: 'me',
                    fields: [
                        { slug: 'loginInfoTitle', en: 'Login Information', fr: 'Informations de connexion' },
                        { slug: 'passwordResetTitle', en: 'Reset Password', fr: 'Réinitialiser mon mot de passe' },
                    ]
                }, {
                    name: 'dashboard',
                    fields: [
                        { slug: 'welcomeMessage', en: 'Welcome!', fr: 'Bienvenue!' }
                    ]
                },
            ]
        });
    }

    render() {
        return (
            <div id="translations">
                <h1>Translations</h1>
                <div id="pages">
                    {
                        this.state.pagesTranslations.map(page => {
                            return (
                                <PageTranslation page={page} onUpdate={this.updateSlug} />
                            );
                        })
                    }
                </div>
            </div>
        );
    }
}


