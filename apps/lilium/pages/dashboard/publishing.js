import { h, Component } from "preact";
import API from '../../data/api';
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { AnimeNumber, ordinal } from '../../widgets/animenumber';
import { ChartGraph } from '../../widgets/chart';
import { Spinner } from '../../layout/loading';
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
                                "#b48efb", "#ba8bf8", "#c189f5", "#c887f3", "#ce84f0",
                                "#d582ee", "#dc80eb", "#e27de8", "#e97be6", "#f777e1"
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

class LastWeekPublishedHistory extends Component {
    render() {
        return (
            <div style={{ position: 'relative', height : '100%' }}>
                <ChartGraph nowrap={true} chart={{
                    type : 'line',
                    data : {
                        labels : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                        datasets : [
                            { data : this.props.lastweek.daily.map(x => x.sessions), label : "Last week", backgroundColor : "#b48efb77" },
                            { data : this.props.weekbefore.daily.map(x => x.sessions), label : "Week before", backgroundColor : "#f777e177" }
                        ]
                    },
                    options : {
                         responsive : true,
                         maintainAspectRatio : false,
                         scales : {
                             yAxes : [{ color : '#333' }]
                         }
                    }
                }} />
            </div>
        )
    }
}

class LastMonthPublishedHistory extends Component {
    render() {
        return (
            <div style={{ position: 'relative', height : '100%' }}>
                <ChartGraph nowrap={true} chart={{
                    type : 'line',
                    data : {
                        labels : (this.props.lastmonth.daily.length > this.props.monthbefore.daily.length ? this.props.lastmonth.daily : this.props.monthbefore.daily).map((x, i) => "Day #" + (i + 1)),
                        datasets : [
                            { data : this.props.lastmonth.daily.map(x => x.sessions),   label : "Last month", backgroundColor : "#b48efb77" },
                            { data : this.props.monthbefore.daily.map(x => x.sessions), label : "Month before", backgroundColor : "#f777e177" }
                        ]
                    },
                    options : {
                         responsive : true,
                         maintainAspectRatio : false,
                         scales : {
                             xAxes : [{ display: false }],
                             yAxes : [{ color : '#333' }]
                         }
                    }
                }} />
            </div>
        )
    }
}

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
    }

    componentWillReceiveProps(props) {
        this.setState(props.performance);
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
            case 2 : return (<LastWeekPublishedHistory lastweek={this.state.lastweek} weekbefore={this.state.weekbefore} />);
            case 3 : return (<LastMonthPublishedHistory lastmonth={this.state.lastmonth.lastmonth} monthbefore={this.state.lastmonth.monthbefore} />);

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

class YesterdayTopPost extends Component {
    componentDidMount() {
        
    }

    componentWillReceiveProps(props) {
        this.setState({ toppost : props.toppost });
    }

    render() {
        if (!this.state.toppost) {
            return ( 
                <div class="dashbaord-yesterday-top-post" style={{ position: 'relative' }}>
                    <Spinner />
                </div> 
            );
        }

        return (
            <div>
                {this.state.toppost.article.title}
            </div>
        );
    }
}

class PopularTopics extends Component {
    componentDidMount() {
        const now = new Date();
        const fewdaysago = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        API.get('/publishing/bulkstats/populartopics', {
            from : fewdaysago.getTime(),
            until : now.getTime()
        }, (err, json, r) => {
            this.setState({ stats : json })
        });
    }

    render() {
        if (!this.state.stats) {
            return ( 
                <div class="popular-topics-pie" style={{ position: 'relative' }}>
                    <Spinner />
                </div> 
            );
        }
    
        return (
            <div>
                <h2>Popular topics</h2>
                <h3>From articles published in the last 30 days</h3>
                <div class="popular-topics-pie" style={{ position: 'relative', height: 420 }}>
                    <ChartGraph nowrap={true} chart={{
                        type : 'pie',
                        data : {
                            labels : this.state.stats.map(t => t.topicname + " @" + t.topicslug + ""),
                            datasets : [
                                { 
                                    data : this.state.stats.map(x => x.published),   
                                    label : "Article published", 
                                    backgroundColor : [
                                        "#b48efb", "#ba8bf8", "#c189f5", "#c887f3", "#ce84f0",
                                        "#d582ee", "#dc80eb", "#e27de8", "#e97be6", "#f777e1"
                                    ].reverse()
                                },
                            ]
                        },
                        options : {
                            responsive : true,
                            maintainAspectRatio : false,
                            legend : {
                               //  display: false
                            }
                        }
                    }} />

                </div>
            </div>
        );
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

    componentDidMount() {
        API.get('/googleanalytics/dashboard', {}, (err, data) => {
            data && this.setState({ performance : data.performance });
        });
    }

    render() {
        console.log(this.state);
        return (
            <div>
                <BigSideTabRealtime performance={this.state.performance} />
                <div class="dashboard-dual-flex">
                    <PopularTopics />
                    <YesterdayTopPost toppost={this.state.performance && this.state.performance.yesterday.toppage} />
                </div>
            </div>
        )
    }
}
