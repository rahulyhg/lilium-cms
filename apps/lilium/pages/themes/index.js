import { h, Component } from 'preact';
import API from '../../data/api';
import { TextField, SelectField, StackBox } from '../../widgets/form';

class ThemeSettingsForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            theme : props.theme
        };

        this.coldState = props.theme.settings || {};
    }

    componentWillReceiveProps(props) {
        this.setState({ theme : props.theme });
    }

    componentDidMount() {

    }

    fieldFromInfoEntry(name, entry) {
        switch (entry.type) {
            case "select": return (<SelectField 
                placeholder={entry.attr.displayname} 
                initialValue={this.coldState[name]} 
                options={entry.attr.datasource.map(s => { return { displayname : s.displayName, value : s.name } })}
            />);

            case "stack": return (<StackBox 
                placeholder={entry.attr.displayname}
                initialValue={this.coldState[name] || []}
            />);

            case "text": default: return (<TextField 
                placeholder={entry.attr.displayname} 
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
                <h1>Settings</h1>
                <div class="theme-settings">
                    <ThemeSettingsForm theme={this.state.current} />
                </div>
            </div>
        );
    }
}