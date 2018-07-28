import { h, Component } from "preact";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { styles } from './style';
import anime from 'animejs'

class RealtimeTicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            totalreaders : 0,
            list : []
        }
    }

    componentDidMount() {
        this.rtid = bindRealtimeEvent("analytics_realtime", data => {
            if (data && data.total) {
                const numbers = {
                    total : this.state.totalreaders
                };

                anime({
                    targets: numbers,
                    total : data.total,
                    round: 1,
                    easing: 'linear',
                    update : () => {
                        this.ctn.textContent = numbers.total;
                    }
                });

                this.setState({ totalreaders : data.total, list : data.pages });
            }
        });
    }

    componentWillUnmount() {
        unbindRealtimeEvent('analytics_realtime', this.rtid);
    }

    render() {
        return (
            <div style={styles.realtimeTicker} class="realtime-ticker">
                <div style={styles.activeReadersCounter} class="active-readers-counter">
                    <b ref={ctn => (this.ctn = ctn)} style={styles.totalReadersBigNum}>0</b>
                    <span style={styles.totalReadersTitle}>active readers on {liliumcms.sitename}</span>
                </div>
                <div style={styles.realtimeListWrapper}>
                    {
                        this.state.list.map(item => (
                            <div key={item.url} class="realtime-listitem">
                                <b class="realtime-listitem-count">{item.count}</b>
                                <a class="realtime-listitem-title" href={item.url} target="_blank">{item.title}</a>
                            </div>
                        ))
                    }
                </div>
            </div>
        );
    }
}

export default class Dashboard extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="dashboard">
                <RealtimeTicker />
            </div>
        );
    }
}