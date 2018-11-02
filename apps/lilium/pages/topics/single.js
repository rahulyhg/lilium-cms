import { h, Component } from 'preact';
import { TextField } from '../../widgets/form';
import API from '../../data/api';

export class SingleTopic extends Component {
    constructor(props) {
        super(props);
        this.state = {
            topic : props.topic,
            ready : false
        }
    }
    
    componentDidMount() {
        API.get("/themes/current", {}, (err, json) => {
            if (json) {
                this.setState({ theme : json, ready : true })
            }
        });
    }

    componentWillReceiveProps(props) {
        if (props.topic) {
            this.setState({ topic : props.topic })
        }
    }

    onChange(name, value) {
        
    }
    
    render() {
        if (!this.state.ready) {
            return null;
        }

        if (this.state.ready && !this.state.topic) {
            return null;
        }

        return (
            <div class="single-topic-form">
                <div>
                    
                </div>
                <TextField initialValue={this.state.topic.displayname} value={ this.state.topic.displayname } id="displayname" onChange={this.onChange.bind(this)} placeholder="Display name" />
                <TextField initialValue={this.state.topic.slug} value={ this.state.topic.slug } id="slug" onChange={this.onChange.bind(this)} placeholder="URL slug" />
            </div>
        );
    }
}
