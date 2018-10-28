import { h, Component } from 'preact';
import { SingleTopic } from './single';
import { TopicPicker } from '../../widgets/form';
import API from '../../data/api';

class TopicCategory extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    onClick() {
        this.props.onClick && this.props.onClick(this.props.category);
    }

    render() {
        return (
            <div class="topic-category" onClick={this.onClick.bind(this)}>
                {this.props.category}
            </div>
        );
    }
}

export default class TopicsManagement extends Component {
    constructor(props) {
        super(props);
        this.state = {
            error : undefined,
            component : null,
            categories : []
        }
    }
    
    componentDidMount() {
        API.get('/topics/category', {}, (err, json, r) => {
            if (err || !json) {
                return this.setState({ error : "Could not fetch categories" });
            }

            this.setState({
                categories : json
            }, () => {
                this.setPage();
            });
        });
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

    selectCategory(category) {

    }
    
    setTopicFromID() {
        this.setState({ loading : true });
        API.get('/topics', {}, (err, json, r) => {
            
        });
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    <h2>
                        There was an error loading this page
                    </h2> 
                </div>
            );
        }

        // <TopicPicker session="manager" onAdd={this.addOne.bind(this)} />
        return (
            <div class="manage-topics-page">
                <h1>Topics</h1>

                <div class="manage-topics-categories">
                    {this.state.categories.map(category => (
                        <TopicCategory category={category} onClick={this.selectCategory.bind(this)} />
                    ))} 
                </div>
            </div>
        );
    }
}
