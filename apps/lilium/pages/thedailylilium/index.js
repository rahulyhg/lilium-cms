import { h, Component } from 'preact'
import API from '../../data/api';
import dateformat from 'dateformat';

const TopPost = props => (
    <div class="tdl-toppost">
        <img class="tdl-toppost-image" src={props.post.fullmedia} />
        <h3>{props.post.headline}</h3>
        <h4>{props.post.subline}</h4>
        <div>
            <p style={{ textAlign : 'left' }}>
                <img src={props.post.authorphoto} style={{ height: 48, width: 48, objectFit : "cover", borderRadius: 10, display: "inline-block", verticalAlign : 'middle', marginRight: 10 }} />
                Written by <b>{props.post.authorname}</b>, the top post generated <b>{props.post.pageviews}</b> page views on the website.
            </p>
        </div>
    </div>
);

class YesterdayStats extends Component {
    render() {
        return (
            <div class="tdl-yesterday-stats">
                
            </div>
        )
    }
}

const NewspaperHeader = () => (
    <div>
        <div id="the-daily-lilium-header">
            <img src="/static/media/lmllogo.png" id="tdl-lilium-logo" />
            <img src="/static/media/thedailylilium.png" class="tdl-lilium-header-image" />
        </div>
        <div id="the-daily-lilium-subheader">
            <h2>ILLUSTRATED DAILY LILIUM NEWS | NOW IN COLOUR</h2>
        </div>
        <div id="the-daily-lilium-dateline">
            <b>Est. 2018</b>
            <b>{dateformat(new Date(), 'dddd, mmmm dd, yyyy')}</b>
            <b>Number {Math.floor(Date.now() / (1000 * 60 * 60 * 24) % 365)}</b>
        </div>
    </div>
);

const DebugDataDump = props => liliumcms.env == "dev" ? (
    <pre style={{ textAlign: 'left' }}>{JSON.stringify(props.data, null, 4)}</pre>
) : null;

export default class TheDailyLilium extends Component {
    static rendererstyle = {
        backgroundColor : "#482b19", 
        zIndex : 12,
        position: 'fixed',
        width : '100%',
        height : '100%',
        transform : 'translate3d(0px, 0px, 0px)',
        top : 0, bottom: 0, left : 0, right : 0, 
        overflowY : 'auto'
    }

    constructor(props) {
        super(props);
        this.state = {
            loading : true
        }

        this.now = new Date();
    }

    loadData() {
        API.get('/thedailylilium', { tzoffset : (new Date()).getTimezoneOffset() }, (err, data, r) => {
            this.setState({ data, loading : false });
        });
    }
    
    componentDidMount() {
        this.loadData();
    }
    
    render() {
        if (this.state.loading) {
            return (<div>Loading...</div>);
        }

        return (
            <div id="the-daily-lilium">
                <NewspaperHeader />

                <div id="the-daily-lilium-content">
                    <div class="tdl-col">
                        <TopPost post={this.state.data.toparticle} />
                    </div>

                    <div class="tdl-col">
                        <YesterdayStats stats={this.state.data.stats} articles={this.state.data.articles} />
                    </div>
                </div>

                <DebugDataDump data={this.state.data} />
            </div>
        );
    }
}