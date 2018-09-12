import { Component, h } from "preact";
import API from "../data/api";

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

    render() {
        return (
            <div className="cakepop-wrapper" onClick={this.props.dismiss.bind(this)}>
                <div className="cakepop-body" onClick={(e) => {e.stopPropagation()}}>
                    <div className="custon-content" dangerouslySetInnerHTML={{ __html: this.props.content }}>
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
                log('CakepopsManager', `Loaded ${data.length} cakepops from the server`, 'success');
                this.setState({ cakepops: data.cakepops });
            } else {
                log('CakepopsManager', 'An error occured while fetching the latest cakepops', 'error');
            }
        });
    }
    
    dismiss() {
        const cakepops = this.state.cakepops;
        cakepops.shift();
        this.setState({ cakepops });
    }

    render() {
        console.log('Cakepop wrapper state: ', this.state);
        if (this.state.cakepops.length) {
            return (
                <Cakepop {...this.state.cakepops[0]} dismiss={this.dismiss.bind(this)} />
            );
        } else {
            return null;
        }
    }
}
