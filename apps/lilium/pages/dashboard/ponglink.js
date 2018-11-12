import { h, Component } from "preact";
import { Spinner } from '../../layout/loading';
import API from '../../data/api';
import dateformat from 'dateformat';
import { getSession } from '../../data/cache';
import { ChartGraph } from '../../widgets/chart';

class PonglinkCampaignDetails extends Component {
    componentDidMount() {
        
    }

    componentWillReceiveProps(props) {
        if (props.campaignid && props.campaignid != this.state.campaignid) {
            this.setState({ loading : true });
            API.get("/ponglinks/insights/" + props.campaignid, {}, (err, json, r) => {
                this.setState({ loading : false, insights : json, campaignid : props.campaignid });
            })
        }   
    }

    render() {
        if (this.state.loading) {
            return <Spinner centered={true} />
        }

        if (!this.state.insights) {
            return null;
        }

        return (
            <div class="dashboard-ponglink-details">
                <h2>{this.state.insights.link.identifier}</h2>

                { this.state.insights.versions.length > 1 ? (<div class="dashboard-ponglink-graph-wrap dashboard-graph-wrap">
                    <h2>Clicks by version</h2>
                    <div class="versions-chart-wrapper">
                        <ChartGraph nowrap={true} chart={{
                            type : 'horizontalBar',
                            data : {
                                labels : this.state.insights.link.versions.map(x => x.medium),
                                datasets : [{
                                    data : this.state.insights.versions.map(x => x.clicks),
                                    label : "Clicks",
                                    backgroundColor : [
                                        "#b48efb", "#ba8bf8", "#c189f5", "#c887f3", "#ce84f0",
                                        "#d582ee", "#dc80eb", "#e27de8", "#e97be6", "#f777e1",
                                        ...[
                                            "#b48efb", "#ba8bf8", "#c189f5", "#c887f3", "#ce84f0",
                                            "#d582ee", "#dc80eb", "#e27de8", "#e97be6", "#f777e1"
                                        ].reverse()
                                    ].reverse()
                                }]
                            },
                            options : {
                                maxBarThickness : 20,
                                barThickness : 20,
                                responsive : true,
                                maintainAspectRatio: false,
                            }
                    }} />
                    </div>
                </div>) : null }

                <div class="dashboard-ponglink-graph-wrap dashboard-graph-wrap">
                    <h2>Daily clicks</h2>
                    <div class="dashboard-daily-chart-wrapper">
                        <ChartGraph nowrap={true} chart={{
                            type : 'line',
                            data : {
                                labels : this.state.insights.daily.reverse().map(x => dateformat(new Date(x.year, 0, x.day), 'dd/mm/yy')),
                                datasets : [{
                                    data : this.state.insights.daily.reverse().map(x => x.clicks),
                                    label : "Daily clicks",
                                    backgroundColor : "#b48efb99" 
                                }]
                            },
                            options : {
                                responsive : true,
                                maintainAspectRatio: false,
                            }
                    }} />
                    </div>
                </div>
            </div>
        );
    }
}

class CampaignCard extends Component {
    constructor(props) {
        super(props);
        this.state = { active : props.active }
    }

    componentWillReceiveProps(props) {
        this.setState({ active : props.active });
    }

    render() {
        return (
            <div style={{ width : this.props.width }} class={"dashboard-ponglink-campaign " + (this.state.active ? "active" : "")} onClick={this.props.onClick.bind(this, this.props.campaign)}>
                <div class="dashboard-ponglink-card-date">{dateformat(new Date(this.props.campaign.createdAt), 'dd, mmmm yyyy')}</div>
                <div class="dashboard-ponglink-card-id">{this.props.campaign.identifier}</div>

                <div class="dashboard-ponglink-card-bot">
                    <div class="dashboard-ponglink-card-clicks">{this.props.campaign.clicks} clicks</div>
                    <div class="dashboard-ponglink-card-author">
                        <img src={this.props.author.avatarURL} /> <span>{this.props.author.displayname}</span>
                    </div>
                </div>
            </div>
        );
    }
}

const CARD_WIDTH = 250;
export class PonglinkTab extends Component {
    static get tabprops() {
        return {
            text : "Ponglinks",
            right : "ponglink",
            id : "ponglink"
        }
    }

    constructor(props) {
        super(props);
        this.state = { campaigns : [] };
        this.cachedusers = getSession("entities");
    }

    componentDidMount() {
        API.get('/ponglinks/dashboard', {}, (err, json, r) => {
            this.setState({ campaigns : json, selected : json[0] })
        });
    }

    componentWillUnmount() {

    }

    selectOne(campaign) {
        this.setState({ selected : campaign });
    }

    render() {
        const cachedusers = this.cachedusers;

        return (
            <div>
                <div class="dashboard-ponglinks-sideslider">
                    <div class="dashboard-ponglinks-campaigns" style={{ width : CARD_WIDTH * this.state.campaigns.length }}>
                        {
                            this.state.campaigns ? this.state.campaigns.map(campaign => (
                                <CampaignCard width={CARD_WIDTH} active={campaign == this.state.selected} author={cachedusers.find(x => x._id == campaign.creatorid)} campaign={campaign} onClick={this.selectOne.bind(this)} />
                            )) : <Spinner centered={true} />
                        }
                    </div>
                </div>
                <div>
                    <PonglinkCampaignDetails campaignid={this.state.selected && this.state.selected._id} />
                </div>
            </div>
        )
    }
}

