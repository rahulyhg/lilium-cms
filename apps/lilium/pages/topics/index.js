import { h, Component } from 'preact';
import { SingleTopic } from './single';
import { TopicPicker } from '../../widgets/form';
import API from '../../data/api';

export default class TopicsManagement extends Component {
    constructor(props) {
        super(props);
        this.state = {
            component : null
        }
    }
    
    componentDidMount() {
        this.setPage();
    }

    componentWillReceiveProps(props) {
        if (props.levels) {
            this.setPage();
        }
    }

    addOne(topic) {
        console.log(topic);
    }

    setPage() {
        if (this.props.levels.length != 0) {
            this.setTopicFromID(this.props.levels[0]);
        } 
    }
    
    setTopicFromID() {
        this.setState({ loading : true });
        API.get('/topics', {}, (err, json, r) => {
            
        });
    }

    render() {
        return (
            <div class="manage-topics-page">
                <TopicPicker session="manager" onAdd={this.addOne.bind(this)} />
            </div>
        );
    }
}