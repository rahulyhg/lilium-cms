import { Component, h } from "preact";
import { ButtonWorker, TextField, MultiSelectBox } from "../../widgets/form";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import { navigateTo } from "../../routing/link";
import { Spinner } from "../../layout/loading";
import { dismissOverlay } from '../../overlay/overlaywrap';

const REQUIRED_FIELDS = ["email", "username", "displayname", "sites", "roles"];

export class CreateEntity extends Component {
    constructor(props) {
        super(props);
        this.values = {};

        this.state = { 
            loading: true
        };
    }

    componentDidMount() {
        const SITES_ENDPOINT = "/sites/all/simple";
        const ROLES_ENDPOINT = "/role";
        API.getMany([
            { endpoint : SITES_ENDPOINT, params : {} },
            { endpoint : ROLES_ENDPOINT, params : {} }
        ], (err, data) => {
            this.setState({ 
                sites : data[SITES_ENDPOINT].map(x => ({ value : x.id, displayName : x.displayName })),
                roles : data[ROLES_ENDPOINT].map(x => ({ value : x.name, displayName : x.displayname })),
                loading : false
            });
        });
    }

    sendinvitation(done) {
        if (REQUIRED_FIELDS.filter(x => !this.values[x]).length == 0) {
            API.post('/entities/invite', this.values, (err, json, r) => {
                if (json && json.ok) {
                    castNotification({
                        type : "success", 
                        title : "Entity created",
                        message : "An invitation email was sent to " + this.values.displayname + " at their email address " + this.values.email
                    });

                    dismissOverlay();
                } else {
                    castNotification({
                        type : "warning", 
                        title : "Could not create entity",
                        message : json && json.reason
                    });
                }

                done && done();
            })
        } else {
            castNotification({
                type : "warning", 
                title : "Missing fields",
                message : "Make sure all fields are filled."
            });

            done && done();
        }
    }

    dismiss() {
        dismissOverlay();
    }

    fieldChanged(name, value) {
        this.values[name] = value;
    }

    render() {
        return (
            <div id="create-entity" class="overlay-form">
                <h1>Send invitation</h1>

                { this.state.loading ? (
                    <div>
                        <Spinner />
                    </div>
                ) : (
                    <div>
                        <TextField onChange={this.fieldChanged.bind(this)} placeholder="Email address" name="email" />
                        <TextField onChange={this.fieldChanged.bind(this)} placeholder="Username" name="username" />
                        <TextField onChange={this.fieldChanged.bind(this)} placeholder="Display name" name="displayname" />
                        
                        <MultiSelectBox onChange={this.fieldChanged.bind(this)} placeholder="Network access" name="sites" options={this.state.sites} />
                        <MultiSelectBox onChange={this.fieldChanged.bind(this)} placeholder="Roles" name="roles" options={this.state.roles} />
        
                        <ButtonWorker text='Cancel' sync={true} work={this.dismiss.bind(this)} />
                        <ButtonWorker text='Invite' theme="blue" type="fill" work={this.sendinvitation.bind(this)} />
                    </div>
                )}
            </div>
        );
    }
}
