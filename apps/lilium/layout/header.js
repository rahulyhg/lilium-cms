import { Component, h } from 'preact';
import { Link } from '../routing/link';
import { LILIUM } from '../data/const';
import { bindRealtimeEvent } from '../realtime/connection';
import { AnimeNumber } from '../widgets/animenumber';
import API from '../data/api';

export class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : undefined,
            totalRT : 0,
            ready : false
        }
    }

    componentDidMount() {
        bindRealtimeEvent("analytics_realtime", data => {
            data && data.total && this.setState({ totalRT : data.total });
        });

        API.get('/googleanalytics/realtime', {}, (err, data) => {
            data && data.total && this.setState({ totalRT : data.total });
        });
    }

    componentWillReceiveProps(props) {
        if (props.session) {
            this.setState({session : props.session});
        }
    }

    render() {
        if (!this.state.session) {        
            log('Header', 'Rendering header component without a session', 'layout');
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
                    <b><AnimeNumber number={this.state.totalRT} /></b>
                    <span> active readers</span>
                </div>
            </header>
        )
    }
}
