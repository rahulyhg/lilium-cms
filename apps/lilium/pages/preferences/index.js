import { Component, h } from 'preact';
import API from '../../data/api';
import { castNotification } from '../../layout/notifications';
import { SelectField, CheckboxField, ButtonWorker } from '../../widgets/form.js';
import { overwriteV4Cache } from '../../data/cache';

const styles ={
    preferencesEdit: {
        margin: 'auto',
        maxWidth : 780
    }
}

export default class Preferences extends Component {
    constructor(props) {
        super(props);

        this.values = {};
        this.supportedLanguages = [];
        this.state = {
            ready: false,
            preferences: {}
        }
    }

    componentDidMount() {
        API.getMany([
            { endpoint: '/preferences', params: {} },
            { endpoint: '/translations/getSupportedLanguages', params: {} }
        ], (err, data) => {
            if (data['/preferences'] && data['/translations/getSupportedLanguages']) {
                this.values = data['/preferences'];
                this.supportedLanguages = data['/translations/getSupportedLanguages'];
                this.setState({ ready: true });

                log('Preferences', 'Fetched user preferences', 'success');
            } else {
                log('Preferences', 'Error fetching user preferences', 'err');
            }
        });
    }

    valueChanged(name, value) {
        if (name == "menuLocked") {
            const ev = new CustomEvent("togglemenusnap", { detail : { snapped : value } });
            document.dispatchEvent(ev);
        }

        API.post('/preferences/updatePreference', {preferenceName: name, value: value }, err => {
            if (!err) {
                log('Preferences', `Set preference ${name} to ${value}`, 'success');
                castNotification({
                    type: 'success',
                    title: 'Preferences saved',
                    message: 'Your changes to your preferences were saved!'
                });
            } else {
                log('Preferences', `Error updating preferenc ${name}`, 'err');
            }
        });
    }

    resetListFilters() {
        const v4SettingString = localStorage.getItem('LiliumV4');
        try {
            const v4Settings = JSON.parse(v4SettingString);
            Object.keys(v4Settings).filter(x => x.startsWith('LF_')).forEach(k => (delete v4Settings[k]));
            localStorage.setItem('LiliumV4', JSON.stringify(v4Settings));
            overwriteV4Cache(v4Settings);

            castNotification({
                type : 'success',
                title : 'Preferences', 
                message : 'List filters were reset.'
            })
        } catch (err) {
            log('Preferences', 'Could not update preferences : ' + err, 'err');
        }
    }

    render() {
        if (this.state.ready) {
            return (
                <div id="preferences" style={ styles.preferencesEdit }>
                    <h1 style={{ margin: "15px 0 20px" }}>Preferences</h1>
                    <div id="preferences-edit">
                        <SelectField name='uiLanguage' placeholder='User Interface Language' initialValue={liliumcms.session.uiLanguage || 'en-ca'}
                                        options={this.supportedLanguages.map(l => { return { displayname: l.displayName, value: l.languageName } })}
                                        onChange={this.valueChanged.bind(this)} />
                        <CheckboxField name='menuLocked' placeholder='Lock Left Menu' initialValue={this.values['menuLocked']}
                                        onChange={this.valueChanged.bind(this)} />
                        <CheckboxField name='publishAnimations' placeholder='Enable publishing animations' initialValue={this.values['publishAnimations']}
                                        onChange={this.valueChanged.bind(this)} />
                        <CheckboxField name='fullscreenArticleEdit' placeholder='Enable fullscreen article editing' initialValue={this.values['fullscreenArticleEdit']}
                                        onChange={this.valueChanged.bind(this)} />
                        <CheckboxField name='badgesNotifications' placeholder='Enable badges popup notifications' initialValue={this.values['badgesNotifications']}
                                        onChange={this.valueChanged.bind(this)} />
                    </div>
                    <div>
                        <ButtonWorker text="Reset all list filters" theme="red" type="outline" sync={true} work={this.resetListFilters.bind(this)} />
                    </div>
                </div>
            );
        } else {
            return (<p>Loading preferences</p>)
        }
    }
}
