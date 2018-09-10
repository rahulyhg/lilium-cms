import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from '../../layout/notifications'
import { TextField, ButtonWorker, CheckboxField, SelectField } from "../../widgets/form";
import { TextEditor } from '../../widgets/texteditor';
import { Link, navigateTo } from "../../routing/link";

export class EditMailTemplate extends Component {
    constructor(props) {
        super(props);
        
        this.unsavedModifications = false;
        this.values= {};
        this.state = { mailTemplate: this.props.mailTemplate || {} }
        this.state.mailTemplate = this.props.chain || {};
        this.state.loading = !this.state.mailTemplate._id;
    }

    componentDidMount() {
        API.get('/mailtemplates/hooks', {}, (err, data, r) => {
            if (!err) {
                this.hooksOptions = data.map(hook => ({ value: hook.name, displayname: hook.displayname }));
                
                if (!this.state.mailTemplate._id) {
                    this.loadFromServer(this.props.id);
                }
            } else {
                castNotification({
                    title: "Couldn't get hooks from server",
                    type: 'error'
                })
            }
        }, true);
    }

    componentWillReceiveProps(newProps) {
        if (newProps.chain._id != this.state.mailTemplate._id) {
            this.loadFromServer(newProps.id);
        }
    }

    loadFromServer() {
        // If no mail template was passed as an extra, make the request
        API.get(`/mailtemplates/${this.props.id}`, {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ mailTemplate: { ...data }, loading: false });
            } else {
                castNotification({
                    title: 'Error while fetching mail template data from the server',
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
        API.post('/mailtemplates/edit/' + this.state.mailTemplate._id, this.values, (err, data, r) => {
            if (r.status == 200) {
                this.unsavedModifications = false;
                done();

                castNotification({
                    title: 'Modifications saved',
                    message: 'Your modifications to the mail template were saved',
                    type: 'success'
                })
            } else {
                done();
                
                castNotification({
                    title: 'Error while saving mail template data on the server',
                    type: 'error'
                });
            }
        });
    }

    remove(done) {
        API.delete('/mailtemplates/' + this.state.mailTemplate._id, {}, (err, data, r) => {
            if (r.status == 200) {
                this.unsavedModifications = false;
                done();

                navigateTo('/mailtemplates');

                castNotification({
                    title: 'Mail templated removed',
                    message: 'The mail template was removed',
                    type: 'success'
                })
            } else {
                done();
                
                castNotification({
                    title: 'Error while removing mail template from the server',
                    type: 'error'
                });
            }
        });
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="content-chain-edit">
                    <h1>Edit Mail Template</h1>

                    <TextField name='displayname' placeholder='Display Name' onChange={this.updateValues.bind(this)} initialValue={this.state.mailTemplate.displayname} />
                    <TextField name='subject' placeholder='Subject' onChange={this.updateValues.bind(this)} initialValue={this.state.mailTemplate.subject} />
                    <TextEditor name='template' onChange={this.updateValues.bind(this)} content={this.state.mailTemplate.template} />
                    <TextField name='description' placeholder='Description' onChange={this.updateValues.bind(this)} initialValue={this.state.mailTemplate.description} />
                    <TextField multiline={true} name='stylesheet' onChange={this.updateValues.bind(this)} initialValue={this.state.mailTemplate.stylesheet} />
                    <SelectField name='hooks' onChange={this.updateValues.bind(this)} options={this.hooksOptions} initialValue={this.state.mailTemplate.hooks} />

                    <ButtonWorker text='Save' work={this.save.bind(this)} />
                    <ButtonWorker text='Delete' theme='danger' work={this.remove.bind(this)} />
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            );
        }
    }
}
