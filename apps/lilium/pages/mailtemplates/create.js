import { Component, h } from "preact";
import { TextField, ButtonWorker } from "../../widgets/form";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import { navigateTo } from "../../routing/link";

export class CreateMailTemplate extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    updateValues(name, value) {
        this.values[name] = value;
    }

    save(done) {
        API.post('/mailtemplates/new', this.values, (err, data, r) => {
            if (r.status == 200) {
                done && done();
                navigateTo('/mailtemplates');
            } else {
                done && done();
                castNotification({
                    title: 'Error creating mail template',
                    type: 'error'
                })
            }
        });
    }

    render() {
        return (
            <div id="create-mailtemplate">
                <h1>Mail Template information</h1>
                <TextField name='displayname' placeholder='Template Name' onChange={this.updateValues.bind(this)} />

                <ButtonWorker text='Save' work={this.save.bind(this)} />
            </div>
        );
    }
}
