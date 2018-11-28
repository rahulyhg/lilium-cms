import { Component, h } from "preact";
import { TextField, ButtonWorker } from '../../widgets/form';
import { navigateTo } from "../../routing/link";
import { dismissOverlay } from '../../overlay/overlaywrap';
import API from "../../data/api";

export class CreateContentChain extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    updateValues(name, val) {
        this.values[name] = val;
    }

    create(done) {
        API.post('/chains/new', this.values, (err, data, r) => {
            if (r.status == 200) {
                done && done();
                navigateTo('/chains/edit/' + data.created._id, data.created);
            }
        });
    }

    render() {
        return (
            <div id="create-content-chain">
                <h1>Create a new content chain</h1>
                <TextField name='title' placeholder='Title' onChange={this.updateValues.bind(this)} />
                <TextField name='subtitle' placeholder='Subtitle' onChange={this.updateValues.bind(this)} />
                <ButtonWorker work={this.create.bind(this)} text='Create' theme='purple' type='fill' />
                <ButtonWorker work={() => { dismissOverlay(); }} sync={false} text='Cancel' theme='red' type='outline' />
            </div>
        );
    }
}
