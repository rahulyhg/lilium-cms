import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from '../../layout/notifications'
import { TextField, ButtonWorker, CheckboxField, SelectField } from "../../widgets/form";
import { TextEditor } from '../../widgets/texteditor';
import { Link, navigateTo } from "../../routing/link";

export class EditStyledPage extends Component {
    constructor(props) {
        super(props);
        
        this.unsavedModifications = false;
        this.values= {};
        this.state = { styledPage: this.props.styledPage || {} }
        this.state.styledPage = this.props.chain || {};
        this.state.loading = !this.state.styledPage._id;
    }

    static visibilityOptions = [
        { value: 'public', displayname: 'Public' },
        { value: 'invisible', displayname: 'Invisible' },
        { value: 'magiclink', displayname: 'Magic Link' }
    ];

    componentDidMount() {
        if (!this.state.styledPage._id) {
            this.loadFromServer(this.props.id);
        }
    }

    componentWillReceiveProps(newProps) {
        if (newProps.chain._id != this.state.styledPage._id) {
            this.loadFromServer(newProps.id);
        }
    }

    loadFromServer() {
        // If no styled page was passed as an extra, make the request
        API.get(`/styledpages/get/${this.props.id}`, {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ styledPage: { ...data }, loading: false });
            } else {
                castNotification({
                    title: 'Error while fetching styled page data from the server',
                    type: 'error'
                });
            }
        });
    }

    updateValues(name, val) {
        this.unsavedModifications = true;
        this.values[name] = val;
    }

    componentWillUnmount() {
        if (this.unsavedModifications) {
            // Cancel navigation?
        }
    }

    save(done) {
        API.post('/styledpages/edit/' + this.state.styledPage._id, this.values, (err, data, r) => {
            if (r.status == 200) {
                this.unsavedModifications = false;
                done();

                castNotification({
                    title: 'Modifications saved',
                    message: 'Your modifications to the styled page were saved',
                    type: 'success'
                })
            } else {
                done();
                
                castNotification({
                    title: 'Error while saving styled page data on the server',
                    type: 'error'
                });
            }
        });
    }

    remove(done) {
        API.delete('/styledpages/' + this.state.styledPage._id, {}, (err, data, r) => {
            if (r.status == 200) {
                this.unsavedModifications = false;
                done();

                navigateTo('/styledpages');

                castNotification({
                    title: 'Styled page removed',
                    message: 'The styled page was removed',
                    type: 'success'
                })
            } else {
                done();
                
                castNotification({
                    title: 'Error while removing styled page from the server',
                    type: 'error'
                });
            }
        });
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="content-chain-edit">
                    <h1>Edit Styled Page</h1>

                    <TextField name='title' autosave={false} placeholder='Title' initialValue={this.state.styledPage.title} onChange={this.updateValues.bind(this)} />
                    <TextField name='slug' autosave={false} placeholder='URL Slug' initialValue={this.state.styledPage.slug} onChange={this.updateValues.bind(this)} />
                    <SelectField name='status' options={EditStyledPage.visibilityOptions} autosave={false} placeholder='Visibility' initialValue={this.state.styledPage.status}
                                onChange={this.updateValues.bind(this)} />
                    <TextEditor name='content' autosave={false} placeholder='Presentation' content={this.state.styledPage.content} onChange={this.updateValues.bind(this)} />
                    <TextField name='customcss' autosave={false} placeholder='Custom CSS' multiline={true} initialValue={this.state.styledPage.customcss} onChange={this.updateValues.bind(this)} />
                    <TextField name='customjs' autosave={false} placeholder='Custom JS' multiline={true} initialValue={this.state.styledPage.customjs} onChange={this.updateValues.bind(this)} />
                    <CheckboxField name='skiplayout' autosave={false} placeholder='Skip Layout' initialValue={this.state.styledPage.skiplayout} onChange={this.updateValues.bind(this)} />
                    <CheckboxField name='staticfile' autosave={false} placeholder='Serve as a static file' initialValue={this.state.styledPage.staticfile} onChange={this.updateValues.bind(this)} />

                    <ButtonWorker text='Save' work={this.save.bind(this)} theme='purple' type='fill' />
                    <a target="_blank" href={'/' + this.state.styledPage.slug + (this.state.styledPage.status == "magiclink" ? ("?accesskey=" + this.state.styledPage.magiclink) : "")}>
                        <ButtonWorker text='View page' theme='blue' type='fill' />
                    </a>
                    <ButtonWorker text='Delete' work={this.remove.bind(this)} theme='red' type="outline" />
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            );
        }
    }
}
