import { h, Component } from "preact";
import { Spinner } from '../../layout/loading';
import API from '../../data/api';

class PonglinkCampaignDetails extends Component {
    componentDidMount() {
        
    }

    componentWillReceiveProps(props) {
        this.setState({ loading : true });
        if (props.campaignid && props.campaignid != this.state.campaignid) {
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
            <div>
                [{JSON.stringify(this.state.insights, null, 4)}]
            </div>
        );
    }
}

class CampaignCard extends Component {
    render() {
        return (
            <div style={{ width : this.props.width }} class="dashboard-ponglink-campaign" onClick={this.props.onClick.bind(this, this.props.campaign)}>
                <b>{this.props.campaign.identifier}</b>
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
        return (
            <div>
                <h2>Ongoing campaigns</h2>
                <div class="dashboard-ponglinks-sideslider">
                    <div class="dashboard-ponglinks-campaigns" style={{ width : CARD_WIDTH * this.state.campaigns.length }}>
                        {
                            this.state.campaigns ? this.state.campaigns.map(campaign => (
                                <CampaignCard width={CARD_WIDTH} campaign={campaign} onClick={this.selectOne.bind(this)} />
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

