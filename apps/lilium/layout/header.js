import { Component, h } from 'preact';
import { Link } from '../routing/link';
import { LILIUM } from '../data/const';
import { bindRealtimeEvent } from '../realtime/connection';

export class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : undefined
        }
    }

    componentDidMount() {
        bindRealtimeEvent("analytics_realtime", data => {
            if (data && data.total) {
                this.realtimeCounter.textContent = data.total;
            }
        });
    }

    componentWillReceiveProps(props) {
        if (props.session) {
            this.setState({session : props.session});
        }
    }

    render() {
        log('Header', 'Rendering header component', 'layout');
        if (!this.state.session) {
            return (<header></header>);
        }

        return (
            <header>
                <Link href="/dashboard">
                    <div id="lilium-logo-wrapper">
                        <img id="lilium-logo" src="/static/media/lmllogo.png" />
                        <span id="lilium-brandname" class="ptext">{LILIUM.vendor}</span>
                    </div>
                </Link>
                <div id="headerRtCounter">
                    <b ref={rt => (this.realtimeCounter = rt)}>Loading realtime</b>
                    <span> readers</span>
                </div>
            </header>
        )
    }
}
