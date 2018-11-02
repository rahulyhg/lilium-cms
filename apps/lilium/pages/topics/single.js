import { h, Component } from 'preact';

export class SingleTopic extends Component {
    constructor(props) {
        super(props);
        this.state = {
            topic : props.topic
        }
    }
    
    componentDidMount() {
        
    }

    componentWillReceiveProps(props) {
        if (props.topic) {
            this.setState({ topic : props.topic })
        }
    }
    
    render() {
        if (!this.state.topic) {
            return null;
        }

        return (
            <div class="single-topic-form">
                { this.state.topic.displayname }
            </div>
        );
    }
}
