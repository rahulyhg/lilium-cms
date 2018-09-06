
import { h, Component } from 'preact'
import API from '../../data/api';

export default class TheDailyLilium extends Component {
    static rendererstyle = {
        backgroundColor : "#482b19", 
        zIndex : 12,
        position: 'fixed',
        width : '100%',
        height : '100%',
        transform : 'translate3d(0px, 0px, 0px)',
        top : 0, bottom: 0, left : 0, right : 0, overflowY : 'auto'
    }

    constructor(props) {
        super(props);
        this.state = {
            loading : true
        }
    }

    loadData() {
        API.get('/thedailylilium', { tzoffset : (new Date()).getTimezoneOffset() }, (err, data, r) => {
            this.setState({ data, loading : false })
        });
    }
    
    componentDidMount() {
        
    }
    
    render() {
        return (
            <div>
                <span>The Daily Lilium</span>
            </div>
        );
    }
}