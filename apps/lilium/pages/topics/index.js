import { h, Component } from 'preact';
import { SingleTopic } from './single';
import { TopicPicker } from '../../widgets/form';
import { TreeView } from '../../widgets/treeview';
import { navigateTo } from '../../routing/link';
import API from '../../data/api';

export default class TopicsManagement extends Component {
    constructor(props) {
        super(props);
        this.state = {
            error : undefined,
            component : null,
            categories : []
        }
    }

    formatTopicsToTreeView(topics) {
        const topLevelCategories = [];
        topics.forEach(x => {
            x.children = x.children || [];
            if (x.parent) {
                const maybeparent = topics.find(y => y._id == x.parent);
                maybeparent.children = maybeparent.children || [];
                maybeparent.children.push(x);
            } else if (x.category) {
                let maybecat = topLevelCategories.find(y => y._id == x.category);
                if (!maybecat) {
                    maybecat = {
                        _id : x.category,
                        displayname : x.category,
                        children : []
                    };
                    topLevelCategories.push(maybecat);
                }

                maybecat.children.push(x);
            }
        });

        return topLevelCategories;
    }
    
    componentDidMount() {
        API.get('/topics/simple', {}, (err, json, r) => {
            if (err || !json) {
                console.log(err, json);
                return this.setState({ error : "Could not fetch categories" });
            }

            this.setState({
                topics : this.formatTopicsToTreeView(json)
            }, () => {
                this.setPage(this.props.levels[0]);
            });
        });
    }

    setPage(topicid) {
        if (topicid) {
            API.get('/topics/get/' + topicid, {}, (err, json, r) => {
                if (json) {
                    this.setState({ topic : json })
                }
            });
        } else {
            
        }
    }

    onEvent(name, { _id, isRoot }) {
        switch(name) {
            // Existing topic was selected with _id as extra
            case "selected":
                if (isRoot) {
                    return;
                }

                navigateTo("/topics/" + _id);
                break;

            // Add topic to parent with _id as "extra"
            case "addto":
                
                break;

            // Add new topic to new category
            case "addroot":

                break;
        }
    }

    componentWillReceiveProps(props) {
        if (props.levels) {
            this.setPage(props.levels[0]);
        }
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    <h2>
                        There was an error loading this page
                    </h2> 
                    <h3>
                        {this.state.error}
                    </h3>
                </div>
            );
        }

        return (
            <div class="manage-topics-page">
                <div class="manage-topics-categories">
                    <TreeView onEvent={this.onEvent.bind(this)} nodes={this.state.topics} topVerbatim="category" value={this.props.levels[0]} />
                </div>
                <div class="manage-topics-single-wrap">
                    <SingleTopic topic={this.state.topic} />
                </div>
            </div>
        );
    }
}
