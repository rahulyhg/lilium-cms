import { h, Component } from 'preact';

import { Spinner } from '../../layout/loading';
import API from '../../data/api';
import { navigateTo } from '../../routing/link';
import { castNotification } from '../../layout/notifications';
import { dismissOverlay } from '../../overlay/overlaywrap';
import { ButtonWorker } from '../../widgets/form';

export class CreateOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : false
        };
    }

    componentDidMount() {
        setTimeout(() => {
            this.textbox.focus();
        }, 100);
    }

    submit(headline) {
        this.setState({ loading : true });
        if (headline && headline.trim()) {
            API.post("/publishing/new", { headline }, (err, resp) => {
                if (resp && resp._id) {
                    navigateTo("/publishing/write/" + resp._id);
                } else {
                    castNotification({
                        type : "error",
                        title : "Could not create article",
                        message : "The article could not be created because of a server error."
                    });
                    this.setState({ loading : false });
                }
            });
        } else {
            this.setState({ loading : false });
            castNotification({
                type : "warning",
                title : "Missing title",
                message : "An article needs a title before it can be created."
            });
        }
    }

    submitText() {
        this.submit(this.textbox.value);
    }

    keydown(ev) {
        if (ev.key == 'Enter') {
            this.submit(ev.target.value.trim());
        } else if (ev.key == "Escape") {
            dismissOverlay();
        }
    }

    dismiss() {
        dismissOverlay();
    }

    render() {
        return (
            <div class="create-article-overlay-form">
                {
                    this.state.loading ? (
                        <Spinner />
                    ) : (
                        <div>
                            <input onKeyDown={this.keydown.bind(this)} ref={x => (this.textbox = x)} placeholder="Headline"  />
                            <div>
                                <ButtonWorker work={this.submitText.bind(this)} text="Create article" type="fill" theme="blue" />
                                <ButtonWorker work={this.dismiss.bind(this)} text="Dismiss" type="outline" theme="red" />
                            </div>
                        </div>
                    )
                }
            </div>
        )
    }
}
