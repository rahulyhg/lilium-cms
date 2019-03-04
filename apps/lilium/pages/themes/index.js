import { h, Component } from 'preact';
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

        this.coldState = settings && settings[props.lang] ? settings[props.lang] : {};
    }

    componentWillReceiveProps(props) {
        this.setState({ theme : props.theme });
    }

    valueChanged(field, value) {
        this.coldState[field] = value;
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
                initialValue={this.coldState[name]} 
                onChange={this.valueChanged.bind(this)}
                options={entry.attr.datasource.map(s => { return { displayname : s.displayName, value : s.name } })}
            />);

            case "stack": return (<StackBox 
                name={name}
                placeholder={entry.attr.displayname}
                onChange={this.valueChanged.bind(this)}
                initialValue={this.coldState[name] || []}
                schema={entry.schema}
            />);

            case "checkbox": return (<CheckboxField 
                name={name}
                placeholder={entry.attr.displayname}
                onChange={this.valueChanged.bind(this)}
                initialValue={this.coldState[name]}
            />);

            case "textarea": return (<TextField 
                name={name}
                multiline={true}
                placeholder={entry.attr.displayname} 
                onChange={this.valueChanged.bind(this)}
                initialValue={this.coldState[name]} 
            />);

            case "image": return (<MediaPickerField
                name={name}
                size={entry.attr.size}
                placeholder={entry.attr.displayname}
                onChange={this.imageChanged.bind(this)}
                initialValue={this.coldState[name]}
            />);

            case "title": return (<h2>{entry.attr.displayname}</h2>);

            case "text": default: return (<TextField 
                name={name}
                placeholder={entry.attr.displayname} 
                onChange={this.valueChanged.bind(this)}
                initialValue={this.coldState[name]} 
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
        element.setAttribute('download', "lilium-theme-export.json");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        element.remove();
        done();
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
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
