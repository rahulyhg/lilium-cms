import { h, Component } from "preact";
import API from '../../data/api';
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { AnimeNumber, ordinal } from '../../widgets/animenumber';
import { ChartGraph } from '../../widgets/chart';
import dateformat from 'dateformat';

class LiveListOfPosts extends Component {
    constructor(props) {
        super(props);
        this.state = {
            posts : this.props.posts || []
        };
    }

    componentWillReceiveProps(props) {
        this.setState({ posts : props.posts })
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
            <div class="dashboard-live-list-posts">
                {
                    this.state.posts.map(post => (
                        <div class="realtime-post-list-item" key={post.url}>
                            <div class="realtime-post-count">
                                <AnimeNumber number={ post.count } />
                            </div>
                            <div class="realtime-post-title">
                                <a class="realtime-post-url" href={post.url} target="_blank">{ post.title }</a>
                                {this.generateSourceIcons(post)}
                            </div>
                        </div>
                    ))
                }
            </div>
        );
    }
}

class HistoricalChartWrapper extends Component {
    render() {
        const pages = [...this.props.yesterday.ratio.pages].splice(0, 10);

        return (
            <div style={{ position : 'relative', height: '100%' }}>
                <ChartGraph nowrap={true} chart={{
                    type : 'bar',
                    data : {
                        labels : pages.map(x => x.page),
                        datasets : [{
                            data : pages.map(x => x.views),
                            label : "Hits by URL",
                            backgroundColor : [
                                "#b48efb",
                                "#ba8bf8",
                                "#c189f5",
                                "#c887f3",
                                "#ce84f0",
                                "#d582ee",
                                "#dc80eb",
                                "#e27de8",
                                "#e97be6",
                                "#f777e1"
                            ].reverse()
                        }]
                    },
                    options : {
                        responsive : true,
                        maintainAspectRatio : false,
                        scales : {
                            xAxes : [{ display: false }],
                            yAxes : [{ color : '#333' }]
                        },
                        onClick : (ev, synth) => {
                            if (synth && synth[0] && synth[0]._index) {
                                window.open(this.props.yesterday.ratio.pages[synth[0]._index].page);
                            }
                        }
                    }
                }} />
            </div>
        );
    }
};

class BigSideTabRealtime extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tabIndex : 0,
            realtimeTotal : 0
        }
    }

    componentDidMount() {
        this.rtid = bindRealtimeEvent("analytics_realtime", data => {
            data && data.total && this.setState({ realtimeTotal : data.total, realtimePages : data.pages });
        });

        API.get('/googleanalytics/realtime', {}, (err, data) => {
            data && data.total && this.setState({ realtimeTotal : data.total, realtimePages : data.pages });
        });

        API.get('/googleanalytics/dashboard', {}, (err, data) => {
            data && this.setState({ ...data.performance });
        });
    }

    componentWillUnmount() {
        unbindRealtimeEvent('analytics_realtime', this.rtid);
    }

    switchTab(index) {
        this.setState({ tabIndex : index });
    }

    getSelectedExpandFromIndex() {
        switch (this.state.tabIndex) {
            case 0 : return (<LiveListOfPosts posts={this.state.realtimePages || []} />);
            case 1 : return (<HistoricalChartWrapper yesterday={this.state.yesterday}  />);
            case 2 : return (<LastWeekPublishedHistory />);

            default: return null;
        }
    }

    render() {
        return (
            <div class="dashboard-publishing-board">
                <div class="dashboard-side-tabs">
                    <BigSideTab selected={this.state.tabIndex == 0} index={0} onClick={this.switchTab.bind(this)} text="Active readers" value={this.state.realtimeTotal ? this.state.realtimeTotal : 0} />
                    <BigSideTab selected={this.state.tabIndex == 1} index={1} onClick={this.switchTab.bind(this)} text="Yesterday" ordinal={true} value={this.state.yesterday ? this.state.yesterday.metrics.sessions : 0} diff={this.state.sameday && (this.state.yesterday.metrics.sessions - this.state.sameday.sessions)} />
                    <BigSideTab selected={this.state.tabIndex == 2} index={2} onClick={this.switchTab.bind(this)} text="Last week" ordinal={true} value={this.state.lastweek ? this.state.lastweek.sessions : 0} diff={this.state.lastweek && (this.state.weekbefore.sessions - this.state.lastweek.sessions)} />
                    <BigSideTab selected={this.state.tabIndex == 3} index={3} onClick={this.switchTab.bind(this)} text="Last month" ordinal={true} value={this.state.lastmonth ? this.state.lastmonth.lastmonth.sessions : 0} diff={this.state.lastmonth && (this.state.lastmonth.lastmonth.sessions - this.state.lastmonth.monthbefore.sessions)} />
                </div>
                <div class="dashboard-selected-expand-tab">
                    { this.getSelectedExpandFromIndex() }
                </div>
            </div>
        );
    }
}

class LastWeekPublishedHistory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data : undefined
        };
    }

    componentDidMount() {
        const lastSun = new Date();
        lastSun.setHours(0);
        lastSun.setMinutes(0);
        lastSun.setSeconds(0);
        lastSun.setDate(lastSun.getDate() - lastSun.getDay());
        const beforeSun = new Date(lastSun.getFullYear(), lastSun.getMonth(), lastSun.getDate() - 7);

        API.get("/publishing/pastpublished", {
            from : beforeSun.getTime(),
            until : lastSun.getTime()
        }, (err, json, r) => {
            json && this.setState({
                data : json,
                from : beforeSun,
                to : lastSun
            });
        });
    }

    render() {
        if (!this.state.data) {
            return null;
        }

        return (
            <div>
                <h2>{dateformat(this.state.from, 'mmmm dd')} - {dateformat(this.state.to, 'mmmm dd')}</h2>
                <div>
                    
                </div>
            </div>
        )
    }
}

class BigSideTab extends Component {
    constructor(props) {
        super(props);
        this.state = {
            number : props.value || 0,
            diff : props.diff
        }
    }

    componentWillReceiveProps(props) {
        this.setState({ value : props.value, selected : props.selected, diff : props.diff });
    }

    render() {
        return (
            <div class={"dashboard-side-tab " + (this.state.selected ? "selected" : "")} onClick={this.props.onClick.bind(this, this.props.index)}>
                <div class="dashboard-side-tab-text">
                    <b>{this.props.text}</b>
                </div>
                <div class="dashboard-side-tab-value">
                    <AnimeNumber duration={1000} number={this.state.value} ordinal={this.props.ordinal} />
                    {
                        this.state.diff ? (
                            <small class={"dashboard-side-tab-diff " + (this.state.diff < 0 ? "red" : "green")}>
                                <i class={"fas fa-triangle " + (this.state.diff < 0 ? 'negative' : '')}></i> <span>{ordinal(Math.abs(this.state.diff))}</span>
                            </small>
                        ) : null
                    }
                </div>
            </div>
        );
    }
}

export class PublishingTab extends Component {
    static get tabprops() {
        return {
            text : "Publishing",
            right : "dashboard",
            id : "publishing"
        }
    }

    render() {
        return (
            <div>
                <BigSideTabRealtime />
                <div>
                    
                </div>
            </div>
        )
    }
}
