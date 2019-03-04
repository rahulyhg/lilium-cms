import { h, Component } from 'preact';
import dateformat from 'dateformat';
import { castNotification } from '../../layout/notifications';
import API from '../../data/api';
import { TextField, SelectField, StackBox, CheckboxField, MediaPickerField, ButtonWorker } from '../../widgets/form';
import { TabView, Tab } from '../../widgets/tabview';

export class ThemeSettingsForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            theme : props.theme
        };

        const settings = props.theme.settings;
    }

    componentWillReceiveProps(props) {
        this.setState({ theme : props.theme });
    }

    valueChanged(field, value) {
        API.post('/themes/updateOneField', {
            field, value, lang : this.props.lang
        }, () => {
            log('Themes', 'Updated theme field : ' + field, 'success');
        });
    }

    imageChanged(field, value) {
        value && value._id && this.valueChanged(field, value._id);
    }

    componentDidMount() {

    }

    fieldFromInfoEntry(name, entry) {
        switch (entry.type) {
            case "select": return (<SelectField 
                name={name}
                placeholder={entry.attr.displayname} 
                initialValue={this.props.theme.settings[this.props.lang][name]} 
                onChange={this.valueChanged.bind(this)}
                options={entry.attr.datasource.map(s => { return { displayname : s.displayName, value : s.name } })}
            />);

            case "stack": return (<StackBox 
                name={name}
                placeholder={entry.attr.displayname}
                onChange={this.valueChanged.bind(this)}
                initialValue={this.props.theme.settings[this.props.lang][name] || []}
                schema={entry.schema}
            />);

            case "checkbox": return (<CheckboxField 
                name={name}
                placeholder={entry.attr.displayname}
                onChange={this.valueChanged.bind(this)}
                initialValue={this.props.theme.settings[this.props.lang][name]}
            />);

            case "textarea": return (<TextField 
                name={name}
                multiline={true}
                placeholder={entry.attr.displayname} 
                onChange={this.valueChanged.bind(this)}
                initialValue={this.props.theme.settings[this.props.lang][name]} 
            />);

            case "image": return (<MediaPickerField
                name={name}
                size={entry.attr.size}
                placeholder={entry.attr.displayname}
                onChange={this.imageChanged.bind(this)}
                initialValue={this.props.theme.settings[this.props.lang][name]}
            />);

            case "title": return (<h2>{entry.attr.displayname}</h2>);

            case "text": default: return (<TextField 
                name={name}
                placeholder={entry.attr.displayname} 
                onChange={this.valueChanged.bind(this)}
                initialValue={this.props.theme.settings[this.props.lang][name]} 
            />);
        }
    }

    render() {
        return (
            <div class="theme-settings-form">
                {Object.keys(this.state.theme.settingForm).map(fieldname => {
                    const FieldComponent = this.fieldFromInfoEntry(fieldname, this.state.theme.settingForm[fieldname]);

                    return FieldComponent;
                })}
            </div>
        );
    }
}

class ThemeCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected : props.active || false
        }
    }

    componentWillReceiveProps(props) {
        this.setState({ selected : props.active || false });
    }

    componentDidMount() {

    }

    render() {
        return (
            <div class={"theme-card" + (this.state.selected ? " selected" : "")}>
                {this.props.theme.dName}
            </div>
        )
    }
}

export default class ThemeSettings extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ready : false
        }
    }

    componentDidMount() {
        API.getMany([
            { endpoint : "/themes/all" },
            { endpoint : "/themes/current" }
        ], (err, resp) => {
            this.setState({ themes : resp["/themes/all"], current : resp["/themes/current"], ready : true });
        })
    }

    export(done) {
        const element = document.createElement('a');
        element.setAttribute('href', document.location.origin + "/themes/export");
        element.setAttribute('download', "lilium-theme-export-" + dateformat(new Date(), "yyyymmdd-HHMM") + ".json");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        element.remove();
        done();
    }

    importJSON(done) {
        const element = document.createElement('input');
        element.setAttribute('type', "file");
        element.style.display = 'none';
        document.body.appendChild(element);

        element.addEventListener('change', ev => {
            const file = element.files[0];
            if (file && file.type.includes('json')) {
                const reader = new FileReader();

                reader.onload = readerEvent => {
                    const text = reader.result;
                    try {
                        const json = JSON.parse(text);
                        API.post('/themes/import', json, (err, resp, r) => {
                            if (r.status == 200) {
                                const th = this.state.current;
                                th.settings = json.data;
                                this.setState({ current : th });

                                castNotification({
                                    type : 'success',
                                    message : 'Theme settings were successfully imported', 
                                    title : 'Import settings'
                                });
                            } else {
                                castNotification({
                                    type : 'warning',
                                    message : 'Something happened during theme settings restoration.', 
                                    title : 'Import settings'
                                });
                            }

                            done();
                        });
                    } catch (jsonEx) {
                        castNotification({
                            type : 'warning',
                            message : 'Invalid settings file', 
                            title : 'Import settings'
                        });
                        
                        done();
                    }
                };

                reader.readAsText(file);
            } else {
                castNotification({
                    type : 'warning',
                    message : 'Invalid settings file', 
                    title : 'Import settings'
                });

                done();
            }

            element.remove();
        });
        element.click();
    }

    render() {
        if (!this.state.ready) {
            return (<div>Loading</div>);
        }

        return (
            <div id="theme-settings-page">
                <h1>Themes</h1>
                <div class="theme-card-list">
                    {this.state.themes.map(x => (
                        <ThemeCard theme={x} active={x.uName == this.state.current.uName} />
                    ))}
                </div>
                <div style={{ maxWidth : 1024, margin : "auto" }}>
                    <h1>Settings</h1>
                    <div class="theme-settings">
                        <TabView>
                            <Tab title="English">
                                <ThemeSettingsForm lang="en" theme={this.state.current} />
                            </Tab>
                            <Tab title="French">
                                <ThemeSettingsForm lang="fr" theme={this.state.current} />
                            </Tab>
                        </TabView>
                        <div class="card" style={{ maxWidth : 1024, margin : "auto", padding: 14 }}>
                            <h2>Import / Export</h2>
                            <ButtonWorker text="Export" work={this.export.bind(this)} />
                            <ButtonWorker text="Import" work={this.importJSON.bind(this)} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
