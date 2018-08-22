import { h, Component } from "preact";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';
import { styles } from './style';
import API from '../../data/api';
import { AnimeNumber } from '../../widgets/animenumber';
import { Spinner } from '../../layout/loading';
import { ChartGraph } from '../../widgets/chart';
import { getSession } from '../../data/cache';
import dateformat from 'dateformat';
import numeral from 'numeral';

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
            <div style={{ margin: "10px 20px" }}>
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
            <div style={{ width : "50%" }}>
                <div style={{ margin: 10, background : "#F9F9F9", boxShadow : "0px 2px 1px rgba(0,0,0,0.2)" }}>
                    <h2 style={styles.boxtitle}>Yesterday top post</h2>
                    <div style={{ position: "relative" }}>
                        <img src={this.state.toppost.article.facebookmedia} style={{ display: "block", width : "100%", height : "auto"}} />
                        <div style={{ lineHeight : "32px", fontFamily : "Oswald, sans-serif", fontSize : 26, padding: "10px 10px 5px" }}>
                            {this.state.toppost.article.title}
                        </div>
                        <div style={{ fontSize : 20, padding: "2px 10px 8px", borderBottom : "1px solid #DDD" }}>
                            {this.state.toppost.article.subtitle}
                        </div>
                        <div style={{ padding: 10, display : "flex", alignItems : "center", background : "white" }}>
                            <img src={this.state.toppost.article.author.avatarURL} style={{ width: 48, height: 48, borderRadius : 48, marginRight : 10 }} />
                            <b>{this.state.toppost.article.author.displayname} </b>
                            <span> - {dateformat(this.state.toppost.article.date, 'mmmm dd, HH:MM')}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

class YesterdayPostList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            list : props.list
        }
    }

    render() {
        const users = getSession("mappedEntities");
        return (
            <div style={{ width : "50%" }}>
                <div style={{ margin: 10, background : "white", boxShadow : "0px 2px 1px rgba(0,0,0,0.2)"}}>
                    <h2 style={styles.boxtitle}>Yesterday's posts ({this.state.list.length})</h2>
                    <div style={{ position: "relative", maxHeight: 450, padding: 5, overflowY : "scroll" }}>
                        { this.state.list.map(x => {
                            
                            return (<div style={{ padding: 5, borderBottom : "1px solid #DDD" }}>
                                <a style={{ color: "#333", textDecoration: "none" }} target="_blank" href={"/" + x.name}>
                                    {x.headline} {users[x.author] ? (<i> - {users[x.author].displayname}</i>) : null}
                                </a>
                            </div>)
                        })}
                    </div>
                </div>
            </div>
        );
    }
}

class ComparisonBox extends Component {
    constructor(props) {
        super(props);
        this.state = {
            y1 : props.y1,
            y2 : props.y2,
            x1 : props.x1,
            x2 : props.x2
        }
    }

    render() {
        let smallRatio = (this.props.y1 < this.props.y2 ? 
            (this.props.y1 / this.props.y2) : (this.props.y2 / this.props.y1)) * 100;

        return (
            <div style={{ background : "white", padding: 20, margin : "10px 20px 20px", boxShadow : "0px 2px 0px rgba(0,0,0,0.2)" }}>
                <h2>{this.props.x1} VS {this.props.x2}</h2>
                <div>
                    <div>{numeral(this.props.y1).format("0.00a")} {this.props.unit}</div>
                    <div style={{ backgroundColor : "#DDD", marginBottom : 20 }}>
                        <div style={{ backgroundColor : "rgb(101, 55, 121)", height: 20, width : (this.props.y1 > this.props.y2 ? "100%" : smallRatio + "%") }}></div>
                    </div>

                    <div>{numeral(this.props.y2).format("0.00a")} {this.props.unit}</div>
                    <div style={{ backgroundColor : "#DDD" }}>
                        <div style={{ backgroundColor : "rgb(101, 55, 121)", height: 20, width : (this.props.y2 > this.props.y1 ? "100%" : smallRatio + "%") }}></div>
                    </div>
                </div>  
            </div>
        )
    }
}

class Comparison extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const thisMonth = dateformat(new Date(), 'mmmm');
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthVocab = dateformat(lastMonth, 'mmmm');

        return (
            <div>
                <ComparisonBox unit="page views" x1="Yesterday" x2={"last " + dateformat(yesterday, 'dddd')} y1={this.props.yesterday} y2={this.props.sameday}/>
                <ComparisonBox unit="page views" x1="Last week" x2="Week before" y1={this.props.lastweek.views} y2={this.props.lastweek.views} />
                <ComparisonBox unit="page views" x1={thisMonth} x2={lastMonthVocab} y1={this.props.lastmonth.lastmonth.views} y2={this.props.lastmonth.monthbefore.views} />
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
            <div>
                <div style={{ display : "flex", padding : "0px 10px" }}>
                    <TopPost toppost={this.state.yesterday.toppage} />
                    <YesterdayPostList list={this.state.yesterday.published} />
                </div>
                <div>
                    <Comparison 
                        yesterday={this.state.yesterday.metrics.views} 
                        sameday={this.state.sameday.views} 
                        lastweek={this.state.lastweek}
                        lastmonth={this.state.lastmonth}
                    />
                    <Last30Days stats={this.state.last30days} />
                </div>
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