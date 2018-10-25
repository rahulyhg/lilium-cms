import { Component, h } from "preact";
import { TextField, ButtonWorker } from '../../widgets/form';
import { navigateTo } from "../../routing/link";
import API from "../../data/api";
import slugify from 'slugify';

export class CreateStyledPage extends Component {
    constructor(props) {
        super(props);

        this.values = {};
    }

    updateValues(name, val) {
        this.values[name] = val;

        if (name == 'title') {
            this.values.slug = slugify(val);
        }
    }

    create(done) {
        API.post('/styledpages/new', this.values, (err, data, r) => {
            if (r.status == 200) {
                done && done();
                navigateTo('/styledpages/edit/' + data.created._id, data.created);
            }
        });
    }

    render() {
        return (
            <div id="create-styled-page" class="overlay-form">
                <h1>Create a new styled page</h1>
                <TextField name='title' placeholder='Title' onChange={this.updateValues.bind(this)} />

                <ButtonWorker work={this.create.bind(this)} text='Create' />
            </div>
        );
    }
}
