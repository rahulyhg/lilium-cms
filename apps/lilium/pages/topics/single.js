import { h, Component } from 'preact';
import { TextField, SelectField, CheckboxField, StackBox } from '../../widgets/form';
import API from '../../data/api';

export class SingleTopic extends Component {
    constructor(props) {
        super(props);
        this.state = {
            topic : props.topic,
            ready : false
        }
    }
    
    componentDidMount() {
        API.get("/themes/current", {}, (err, json) => {
            if (json) {
                this.setState({ 
                    theme : json, 
                    ready : true,
                    archivetemplates : [{ displayname : " - Use parent template - ", file : "" }, ...json.templates.archive],
                    articletemplates : [{ displayname : " - Use parent template - ", file : "" }, ...json.templates.article]
                });
            }
        });
    }

    componentWillReceiveProps(props) {
        if (props.topic) {
            this.setState({ topic : props.topic });
        }
    }

    fieldFromInfoEntry(name, entry, value) {
        switch (entry.type) {
            case "select": return (<SelectField 
                name={name}
                placeholder={entry.attr.displayname} 
                initialValue={value}
                value={value}
                onChange={this.overrideChanged.bind(this)}
                options={entry.attr.datasource.map(s => { return { displayname : s.displayName, value : s.name } })}
            />);

            case "stack": return (<StackBox 
                name={name}
                placeholder={entry.attr.displayname}
                onChange={this.overrideChanged.bind(this)}
                initialValue={value || []}
                value={value || []}
            />);

            case "checkbox": return (<CheckboxField 
                name={name}
                placeholder={entry.attr.displayname}
                value={value}
                onChange={this.overrideChanged.bind(this)}
                initialValue={value}
            />);

            case "textarea": return (<TextField 
                name={name}
                multiline={true}
                placeholder={entry.attr.displayname} 
                value={value}
                onChange={this.overrideChanged.bind(this)}
                initialValue={value} 
            />)

            case "title": return (<h2>{entry.attr.displayname}</h2>);

            case "text": default: return (<TextField 
                name={name}
                placeholder={entry.attr.displayname} 
                value={value}
                onChange={this.overrideChanged.bind(this)}
                initialValue={value} 
            />);
        }
    }

    overrideChanged(name, value) {
        API.put('/topics/' + this.state.topic._id, { field : "override." + name, value }, (err, json, r) => {

        });
    }

    onChange(name, value) {
        API.put('/topics/' + this.state.topic._id, { field : name, value }, (err, json, r) => {

        });
    }
    
    render() {
        if (!this.state.ready) {
            return null;
        }

        if (this.state.ready && !this.state.topic) {
            return null;
        }

        return (
            <div>
                <div class="single-topic-form">
                    <div>
                        <h2><span>{this.state.topic.displayname}</span> <small>/{this.state.topic.completeSlug}</small></h2>
                    </div>
                    <div>
                        <TextField initialValue={this.state.topic.displayname} value={ this.state.topic.displayname } 
                            name="displayname" onChange={this.onChange.bind(this)} placeholder="Display name" />
                        <SelectField initialValue={this.state.topic.archivetemplate} value={ this.state.topic.archivetemplate } 
                            name="archivetemplate" placeholder="Archive Template" onChange={this.onChange.bind(this)} 
                            options={ this.state.archivetemplates.map(x => ({ displayname : x.displayname, value : x.file })) }  />
                        <SelectField initialValue={this.state.topic.articletemplate} value={ this.state.topic.articletemplate } 
                            name="articletemplate" placeholder="Article Template" onChange={this.onChange.bind(this)} 
                            options={ this.state.articletemplates.map(x => ({ displayname : x.displayname, value : x.file })) }  />
                        <CheckboxField initialValue={this.state.topic.directory} onChange={this.onChange.bind(this)}
                            name="directory" placeholder="Directory mode" />
                    </div>
                </div>
                <div class="theme-override-form">
                    <h2>{this.state.theme.dName} override for {this.state.topic.displayname}</h2>
                    { Object.keys(this.state.theme.settingForm).map(settingName => (
                        <div class="theme-override-field" key={settingName}>
                            {this.fieldFromInfoEntry(settingName, this.state.theme.settingForm[settingName], this.state.topic.override[settingName])}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
