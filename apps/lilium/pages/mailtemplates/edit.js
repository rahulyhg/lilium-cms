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
        // If no mail template was passed as an extra, make the request
        API.get(`/mailtemplates/get/${this.props.id}`, {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ styledPage: { ...data }, loading: false });
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
        API.post('/mailtemplates/edit/' + this.state.styledPage._id, this.values, (err, data, r) => {
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
        API.post('/mailtemplates/remove/' + this.state.styledPage._id, {}, (err, data, r) => {
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
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            );
        }
    }
}
