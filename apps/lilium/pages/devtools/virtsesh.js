import { h, Component } from 'preact';
import API from '../../data/api';
import { getSession } from '../../data/cache';
import { SelectField, ButtonWorker } from '../../widgets/form';

export default class VirtualSession extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };

        this.values = {};
        this.users = getSession("entities").map(x => (
            {
                value : x._id,
                displayname : x.displayname
            }
        ))
    }

    fieldChanged(name, value) {
        this.values[name] = value;
    }

    loginas() {
        API.post('/entities/impersonate/' + this.values.entityid, {}, (err, json, r) => {
            document.location = "/lilium";
        });
    }

    render() {
        return (
            <div id="virtual-session">
                <div class="responsive-wrap">
                    <h1>Login as</h1>
                    <SelectField options={this.users} name="entityid" onChange={this.fieldChanged.bind(this)} />
                    <ButtonWorker text="Login as user" work={this.loginas.bind(this)} />
                </div>
            </div>
        )
    }
}