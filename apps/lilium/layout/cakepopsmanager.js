import { Component, h } from "preact";
import API from "../data/api";
import { castNotification } from './notifications'

class Cakepop extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.styleEl = document.createElement('style');
        this.styleEl.textContent = this.props.stylesheet;
        document.head.appendChild(this.styleEl);
    }

    componentWillUnmount() {
        this.styleEl.remove();
    }

    respond(respIdentifier) {
        const action = this.props.mendatory ? 'respond' : 'read'        
        API.post('/cakepop/' + action, { id: this.props._id, response: respIdentifier }, (err, data, r) => {
            if (r.status == 200) {
                log('CakepopManager', `Responded to cakepop '${this.props.title}' with response: ${respIdentifier}`, 'success');
                this.props.dismiss();
            } else {
                log('CakepopManager', `Error while responding to cakepop ${this.props.title}. Dismissing the cakepop regardless`, 'error');
                this.props.dismiss();
            }
        });
    }

    maybeDismiss() {
        if (this.props.mendatory) {
            castNotification({
                title: 'Please provide a response to this popup',
                message: 'Please provide a response to this popup in order to dismiss it'
            })
        } else {
            this.props.dismiss(true);
        }
    }

    render() {
        return (
            <div className="cakepop-wrapper" onClick={this.maybeDismiss.bind(this)}>
                <div className="cakepop-body card" onClick={(e) => {e.stopPropagation()}}>
                    <div className="custon-content" dangerouslySetInnerHTML={{ __html: this.props.content }}>
                    </div>
                    <div className="content-footer">
                        <footer className="card-actions">
                            {
                                (this.props.mendatory) ? (
                                    (this.props.responses.length) ? (
                                        this.props.responses.map(response => (
                                            <span className="card-action" style={{ color: response.color }} onClick={this.respond.bind(this, response.identifier)}>
                                                {response.displayname}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="card-action" onClick={this.props.dismiss.bind(this, true)}>Dismiss</span>
                                    )
                                ) : (
                                    <span className="card-action" onClick={this.props.dismiss.bind(this, true)}>Dismiss</span>
                                )
                            }
                        </footer>
                    </div>
                </div>
            </div>
        );
    }
}

export class CakepopWrapper extends Component {
    constructor(props) {
        super(props);
        this.state = { cakepops: [] }
    }
    
    componentDidMount() {
        API.get('/cakepop/latests', {}, (err, data, r) => {
            if (r.status == 200 ) {
                log('CakepopsManager', `Loaded ${data.cakepops.length} cakepops from the server`, 'success');
                this.setState({ cakepops: data.cakepops });
            } else {
                log('CakepopsManager', 'An error occured while fetching the latest cakepops', 'error');
            }
        });
    }

    shiftCakepops() {
        const cakepops = this.state.cakepops;
        cakepops.shift();
        this.setState({ cakepops });
    }
    
    dismiss(sendRequest = false) {
        if (sendRequest) {
            const action = this.state.cakepops[0].mendatory ? 'respond' : 'read'
            API.post('/cakepop/' + action, { id: this.state.cakepops[0]._id, response: 'dismiss' }, (err, data, r) => {
                if (r.status == 200) {
                    log('CakepopManager', `Responded to cakepop '${this.state.cakepops[0].title}' with response: dismiss`, 'success');
                } else {
                    log('CakepopManager', `Error while responding to cakepop ${this.state.cakepops[0].title}. Dismissing the cakepop regardless`, 'error');
                }

                this.shiftCakepops();
            });
        } else {
            this.shiftCakepops();
        }
    }

    render() {
        if (this.state.cakepops.length) {
            return (
                <Cakepop {...this.state.cakepops[0]} dismiss={this.dismiss.bind(this)} />
            );
        } else {
            return null;
        }
    }
}
