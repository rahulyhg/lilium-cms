import { h, Component } from 'preact';
import { TextField, SelectField, ButtonWorker } from '../../widgets/form';
import { getSession } from '../../data/cache';
import API from '../../data/api'

export default class DevToolNotifications extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };

        this.coldState = {};
        this.users = getSession("entities").map(x => {
            return {
                value : x._id,
                displayname : x.displayname
            }
        });
    }

    componentDidMount() {

    }

    fieldChanged(name, value) {
        this.coldState[name] = value;
    }

    send(done) {
        API.post('/devtools/notifications', this.coldState, () => done());
    }

    render() {
        return (
            <div style={{ padding : 20 }}>
                <SelectField name="entity" placeholder="User target" options={this.users} onChange={this.fieldChanged.bind(this)} />
                <TextField name="title"    placeholder="Notification title" onChange={this.fieldChanged.bind(this)} />
                <TextField name="msg"      placeholder="Notification message" onChange={this.fieldChanged.bind(this)} />
                <SelectField name="type"   placeholder="Level (type)" onChange={this.fieldChanged.bind(this)} onChange={this.fieldChanged.bind(this)} options={[
                    { value : "info", displayname : "Log" },
                    { value : "warning", displayname : "Warning" },
                    { value : "success", displayname : "Success" },
                    { value : "error", displayname : "Error" },
                ]} />
                <ButtonWorker text="Dispatch notification" work={this.send.bind(this)} />
            </div>
        );  
    }
}