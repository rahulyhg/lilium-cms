import { h, Component } from "preact";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { styles } from './style';
import API from '../../data/api';
import { AnimeNumber } from '../../widgets/animenumber';
import { Spinner } from '../../layout/loading';
import { ChartGraph } from '../../widgets/chart';
import { getSession } from '../../data/cache';

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

class Last30Days extends Component {
    constructor(props) {
        super(props);

        this.data   = props.stats.daily.map(x => x.views);
        this.labels = props.stats.daily.map((x, i) => "");

        log('Dashboard', 'Displaying Last 30 Days component', 'detail');
    }

    render() {
        return (
            <div style={{ width : "50%", margin: 10 }}>
                <h2 style={styles.boxtitle}>Latest 30 days</h2>
                <div style={styles.graphbg}>
                    <ChartGraph type="line" data={this.data} labels={this.labels} />
                </div>                
            </div>                
        )
    }
}

class TopPost extends Component {
    constructor(props) {
        super(props);
        this.state = {
            toppost : props.toppost
        };
    }

    render() {
        return (
            <div style={{ width : "50%", margin: 10, background : "white", boxShadow : "0px 2px 1px rgba(0,0,0,0.2)" }}>
                <h2 style={styles.boxtitle}>Yesterday top post</h2>
                <div style={{ position: "relative" }}>
                    <div style={{ fontSize : 18, padding: 10 }}>{this.state.toppost.article.title}</div>
                    <img src={this.state.toppost.article.facebookmedia} style={{ display: "block", width : "100%", height : "auto"}} />
                </div>
            </div>
        )
    }
}

class HistoricalDashboard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true
        }
    }

    componentDidMount() {
        API.get('/googleanalytics/dashboard', {}, (err, data) => {
            this.setState({
                loading: false,
                ...data.performance
            });
        });
    }
    
    render() {
        if (this.state.loading) {
            return (
                <div>
                    <Spinner />
                </div>
            )
        }

        return (
            <div style={{ display : "flex", padding : "0px 10px" }}>
                <Last30Days stats={this.state.last30days} />
                <TopPost toppost={this.state.yesterday.toppage} />
            </div>
        )
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
                <HistoricalDashboard />
            </div>
        );
    }
}