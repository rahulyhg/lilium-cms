import { h, Component } from 'preact'
import API from '../../data/api';
import dateformat from 'dateformat';

class TopPost extends Component {
    render() {
        return (
            <div class="tdl-toppost">
                <img class="tdl-toppost-image" src={this.props.post.fullmedia} />
                <h3>{this.props.post.headline}</h3>
                <h4>{this.props.post.subline}</h4>
            </div>
        )
    }
}

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
                <div id="the-daily-lilium-content">
                    <div class="tdl-col">
                        <TopPost post={this.state.data.toparticle} />
                    </div>

                    <div class="tdl-col">
                        
                    </div>
                </div>
            </div>
        );
    }
}