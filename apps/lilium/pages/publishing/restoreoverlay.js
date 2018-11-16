import { h, Component } from 'preact';

import { Spinner } from '../../layout/loading';
import API from '../../data/api';
import { navigateTo } from '../../routing/link';
import { castNotification } from '../../layout/notifications';
import { dismissOverlay } from '../../overlay/overlaywrap';
import { ButtonWorker } from '../../widgets/form';
import dateformat from 'dateformat';

export class RestoreOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : false,
            entry : this.props.extra.historyentry
        };
    }

    componentDidMount() {
        this.originalframe.contentWindow.document.head.innerHTML = 
            this.patchframe.contentWindow.document.head.innerHTML = `
                <link rel="stylesheet" type="text/css" id="u1" href="/compiled/theme/tinymce.css">
            `;

        this.originalframe.contentWindow.document.body.innerHTML = this.props.extra.content;

        API.get('/publishing/patch/' + this.state.entry._id, {}, (err, json, r) => {
            this.patchcontent = json.patch.content;
            this.patchframe.contentWindow.document.body.innerHTML = json.patch.content;
        });
    }

    overwrite() {
        this.props.extra.overwriteCallback(this.patchcontent);
        dismissOverlay();
    }

    render() {
        return (
            <div class="publishing-restore-history-overlay">
                <div class="prh-header">
                    <h2>Restore from history</h2>
                </div>
                <div class="prh-slide-titles">
                    <div class="prh-slide-title">Current version</div>
                    <div class="prh-slide-title">Version from {dateformat(new Date(this.state.entry.at), 'mmmm dd, HH:MM')}</div>
                </div>
                <div class="prh-versions">
                    <div class="prh-original-version">
                        <iframe ref={x => (this.originalframe = x)}></iframe>
                    </div>
                    <div class="prh-patch-version">
                        <iframe ref={x => (this.patchframe = x)}></iframe>
                    </div>
                </div>
                <div class="prh-actions">
                    <ButtonWorker text="Overwrite current version" theme="blue" type="outline" sync={true} work={this.overwrite.bind(this)} />
                    <ButtonWorker text="Keep current version" theme="white" type="fill" sync={true} work={() => dismissOverlay()} />
                </div>
            </div>
        )
    }
}
