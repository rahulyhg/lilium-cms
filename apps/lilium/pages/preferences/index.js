import { Component, h } from 'preact';
import { fieldFromType, CheckboxField } from '../../widgets/form.js';
import API from '../../data/api';

class PreferenceEdit extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        // const fieldClass = fieldFromType(this.props.type);
        return (
            <div className="preference">
            </div>
        );
    }
}

export default class Preferences extends Component {
    constructor(props) {
        super(props);

        this.values = {};
        this.state = {
            ready: false,
            preferences: {}
        }
    }

    componentDidMount() {
        this.values = liliumcms.session.preferences;
        API.get('/preferences', {}, (err, pref) => {
            if(!err) {
                this.setState({
                    ready: true
                });

                log('Preferences', 'Fetched user preferences', 'success');
            } else {
                log('Preferences', 'Error fetching user preferences', 'err');
            }
        });
    }

    valueChanged(name, value) {
        API.post('/preferences/updatePreference', {preferenceName: name, value: value }, err => {
            if (!err) {
                log('Preferences', `Set preference ${name} to ${value}`, 'success');
            } else {
                log('Preferences', `Error updating preferenc ${name}`, 'err');
            }
        });
    }

    render() {
        // this.values['menuLocked']
        if (this.state.ready) {
            console.log(this.values['menuLocked']);
            return (
                <div id="preferences">
                    <h1>Preferences</h1>
                    <div id="preferences-edit">
                        <CheckboxField name='menuLocked' placeholder='Lock Left Menu' initialValue={this.values['menuLocked']}
                                        onChange={this.valueChanged.bind(this)} />
                        <SelectField name='uiLanguage' placeholder='User Interface Language' />
                    </div>
                </div>
            );
        } else {
            return (<p>Loading preferences</p>);
        }
    }
}
