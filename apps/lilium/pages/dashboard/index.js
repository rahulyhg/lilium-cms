import { h, Component } from "preact";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { styles } from './style';
import API from '../../data/api';
import { AnimeNumber } from '../../widgets/animenumber';

class RealtimeTicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            totalreaders : 0,
            list : [],
            ready : false
        }
    }

    componentDidMount() {
        this.rtid = bindRealtimeEvent("analytics_realtime", data => {
            data && data.total && this.updateCounters(data);
        });

        API.get('/googleanalytics/realtime', {}, (err, data) => {
            data && data.total && this.updateCounters(data);
        });
    }

    updateCounters(data) {
        this.setState({ totalreaders : data.total, list : data.pages, ready : true });
    }

    componentWillUnmount() {
        unbindRealtimeEvent('analytics_realtime', this.rtid);
    }

    generateSourceIcons(item) {
        const sources = [];
        switch (item.source) {
            case "google":   sources.push(<i class="rt-source-icon fab fa-google"></i>); break;
            case "facebook": sources.push(<i class="rt-source-icon fab fa-facebook"></i>); break;
            case "pinterest":sources.push(<i class="rt-source-icon fab fa-pinterest-p"></i>); break;
            case "twitter":  sources.push(<i class="rt-source-icon fab fa-twitter"></i>); break;
            case "flipboard":sources.push(<i class="rt-source-icon fab fa-flipboard"></i>); break;
            case "(direct)":
            case "direct":   sources.push(<i class="rt-source-icon far fa-globe-americas"></i>); break;

            default: sources.push(<i class="rt-source rt-source-word">{item.source}</i>);
        }

        item.url.includes('/amp') && sources.push(<i class="rt-source-icon far fa-bolt"></i>);
        item.query && item.query.includes("utm_source") && sources.push(<i class="rt-source-icon far fa-dollar-sign"></i>);

        return sources;
    }

    render() {
        return (
            <div style={styles.realtimeTicker} class="realtime-ticker">
                <div style={styles.activeReadersCounter} class="active-readers-counter">
                    {
                        this.state.ready ? (
                            <div>
                                <b ref={ctn => (this.ctn = ctn)} style={styles.totalReadersBigNum}><AnimeNumber number={this.state.totalreaders} /></b>
                                <span style={styles.totalReadersTitle}>active readers on {liliumcms.sitename}</span>
                            </div>
                        ) : null
                    }
                </div>
                <div style={styles.realtimeListWrapper}>
                    {
                        this.state.list.map(item => (
                            <div key={item.url} class="realtime-listitem">
                                <b class="realtime-listitem-count"><AnimeNumber number={item.count} /></b>
                                <a class="realtime-listitem-title" href={item.url.replace(' - ' + liliumcms.sitename, '')} target="_blank">
                                    <span>{item.title}</span>
                                    <div class="realtime-sources-list">                                    
                                        {this.generateSourceIcons(item)}
                                    </div>
                                </a>
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