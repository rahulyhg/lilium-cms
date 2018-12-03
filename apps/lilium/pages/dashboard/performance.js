import { h, Component } from "preact";
import API from '../../data/api';
import { ChartGraph } from '../../widgets/chart';
import dateformat from 'dateformat';

class Last30DaysStats extends Component {
    constructor(props) {
        super(props);
        this.state = {};

        const d = new Date();
        this.firstday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 30).getTime();
    }

    componentDidMount() {
        API.get('/googleanalytics/author', {}, (err, json, r) => {
            this.setState({ last30days : json });
        });
    }

    render() {
        if (!this.state.last30days || this.state.last30days.err) {
            return (<h2>{_v('nostats')}</h2>)
        }

        return (
            <div class="dashboard-performance-last-30-days dashboard-graph-wrap">
            <h2>Last 30 days reader sessions</h2>
                <div style={{ position: "relative", height: 380 }}>
                    <ChartGraph nowrap={true} chart={{
                        type : 'line',
                        data : {
                            labels : this.state.last30days.daily.map((x, i) => dateformat(new Date(this.firstday + (1000*60*60*24*i)), 'dd/mm/yy')),
                            datasets : [
                                {
                                    data : this.state.last30days.daily.map(x => x.sessions),
                                    label : "Daily sessions",
                                    backgroundColor : "#b48efb99"
                                },
                                {
                                    data : this.state.last30days.daily.map(x => x.views),
                                    label : "Page views",
                                    backgroundColor : "#f777e199" 
                                }
                            ]
                        },
                        options : {
                            responsive : true,
                            maintainAspectRatio: false,
                            scales: {
                                xAxes: [{
                                    ticks: {
                                        callback: (value, index, values) => index % 3 == 0 ? value : null
                                    }
                                }]
                            }
                        }
                    }} />
                </div>
            </div>
        );
    }
}

class PublishingActivity extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        API.get('/entities/dashboardstats', {}, (err, json, r) => {
            // totalposts, topics, activity
            this.setState(json);
        });
    }

    render() {
        if (!this.state.totalposts) {
            return null;
        }

        const days = [{x:0},{x:0},{x:0},{x:0},{x:0},{x:0},{x:0}];
        const total = this.state.activity.reduce((acc, cur) => acc + cur.published, 0);
        this.state.activity.forEach(stat => {
            days[stat.day - 1].x = Math.round((stat.published / total) * 100)
        });

        const topics = this.state.topics.splice(0, 10);

        return (
            <div class="dashboard-dual-flex">
                <div class="dashboard-publishing-activities dashboard-graph-wrap">
                    <h2>Publishing week momentum</h2>
                    <div style={{ position: "relative", height: 380 }}>
                        <ChartGraph nowrap={true} chart={{
                            type : 'doughnut',
                            data : {
                                labels : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], 
                                datasets : [ {
                                    data : days.map(act => act.x),
                                    label : "Article published",
                                    backgroundColor : [
                                        "#FF9AA2", "#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA", "#E8C8EA"
                                    ]
                                } ]
                            },
                            options : {
                                responsive : true,
                                maintainAspectRatio: false,
                                tooltips: {
                                    callbacks: {
                                        label: (tooltipItem, data) => days[tooltipItem.index].x + "%"
                                    }
                                }
                            }
                        }} />
                    </div>
                </div>
                <div class="dashboard-favourite-topics dashboard-graph-wrap">
                    <h2>Favourite topics</h2>
                    <div style={{ position: "relative", height: 380 }}>
                        <ChartGraph nowrap={true} chart={{
                            type : 'horizontalBar',
                            data : {
                                labels : topics.map(x => x.topic),
                                datasets : [ {
                                    data : topics.map(x => x.posts),
                                    label : "Article published",
                                    backgroundColor : [
                                        "#b48efb", "#ba8bf8", "#c189f5", "#c887f3", "#ce84f0",
                                        "#d582ee", "#dc80eb", "#e27de8", "#e97be6", "#f777e1",
                                    ].reverse()
                                } ]
                            },
                            options : {
                                responsive : true,
                                maintainAspectRatio: false,
                                tooltips: {
                                    callbacks: {
                                        title : (tooltipItem, data) => tooltipItem[0].yLabel + " @" + topics[tooltipItem[0].index].topicslug
                                    }
                                }
                            }
                        }} />
                    </div>

                </div>
            </div>
        );
    }
   
}

export class PerformanceTab extends Component {
    static get tabprops() {
        return {
            text : _v("myperformance"),
            right : "create-articles",
            id : "performance"
        }
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    render() {
        return (
            <div>
                <Last30DaysStats />
                <PublishingActivity />
            </div>
        )
    }
}

