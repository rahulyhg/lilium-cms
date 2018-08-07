import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import { setPageCommands } from '../../layout/lys';
import { TextEditor } from '../../widgets/texteditor';
import { TextField, ButtonWorker } from '../../widgets/form';
import { getSession } from '../../data/cache';

import dateFormat from 'dateformat';

import API from "../../data/api";

const styles = {
    sidebarTitle : {
        padding: 10,
        display: "block",
        borderBottom: "1px solid #d6ace8",        
        borderTop: "1px solid #d6ace8",
        color: "#4d2161",
        backgroundColor: "#e3c6ea"
    }
}

class HistoryEntry extends Component {
    makeBackgroundStyle() {

    }

    createMessage() {
        switch (this.props.entry.type) {
            case "update":
                return "updated the " + this.props.entry.diffs.map(x => x.field).join(', ');
            case "published":
                return "published this article";
            case "unpublished":
                return "set back this article to draft";
            case "submitted":
                return "sent this article for review";
            case "refused":
                return "refused the review";
            case "destroyed":
                return "destroyed this article";
            case "created":
                return "created this article";
            default:
                return "updated this article";
        }
    }

    render() {
        return (
            <div class={"history-entry history-entry-" + this.props.entry.type}>
                <div class="history-entry-avatar-wrap">
                    <img class="history-entry-avatar" src={this.props.actor.avatarURL} />
                </div>
                <div class="history-entry-text">
                    <b>{this.props.actor.displayname}</b>
                    <span> { this.createMessage() } </span>
                    <div class="history-entry-date">{ dateFormat(new Date(this.props.entry.at), 'HH:MM, dddd mmm yyyy') }</div>
                </div>
            </div>
        );
    }
}

class PublishingHistory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            history : []
        };

        const cachedUsers = {};
        getSession("entities").forEach(x => {
            cachedUsers[x._id] = x;
        });
        this.cachedUsers = cachedUsers;
    }

    refresh() {
        API.get('/publishing/history/' + this.props.post._id, {}, (err, history) => {
            this.setState({ history });
        })
    }

    componentDidMount() {
        this.refresh();
    }
    
    render() {
        return (
            <div style={{ overflow : "auto" }}>
                {
                    this.state.history.map(entry => (<HistoryEntry entry={entry} actor={this.cachedUsers[entry.actor]} />))
                }

                <HistoryEntry entry={{
                    type : "created",
                    at : this.props.post.createdOn
                }} actor={this.cachedUsers[this.props.post.createdBy]} />
            </div>
        );
    }
}

class PublishingSidebar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            post : props.post
        }
    }

    componentWillReceiveProps(props) {
        this.setState({ post : props.post });
    }

    render() {
        if (!this.state.post) {
            return null;
        }

        return (
            <div>
                <b style={styles.sidebarTitle}>Manage</b>
                <div style={{ padding : 10 }}>
                    <ButtonWorker text="Publish" />
                </div>

                <b style={styles.sidebarTitle}>Activity</b>
                <PublishingHistory post={this.state.post} />
            </div>
        );
    }
}

export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading : true
        };
    }

    componentDidMount() {
        this.requestArticle(this.props.postid);
    }

    save() {
        log('Publishing', 'Saving current post with id ' + this.props.postid, 'detail');
    }

    requestArticle(postid) {
        this.setState({ loading : true });
        setPageCommands([{
            command : "save",
            displayname : "Save Article",
            execute : this.save.bind(this)
        }]);

        const endpoints = {
            post : { endpoint : "/publishing/write/" + postid, params : {} }
        };

        API.getMany(Object.keys(endpoints).map(key => endpoints[key]), resp => {
            const post = resp[endpoints.post.endpoint];
            post ?
                log('Publishing', 'About to display : ' + post.headline, 'detail') :
                log('Publishing', 'Article not found : ' + postid, 'warn');
            
            this.setState(post ? { post, loading: false } : { error : "Article not Found", loading : false }, () => {
                
            });
        });
    }

    componentWillReceiveProps(props) {
        if (props.postid) {
            this.requestArticle(props.postid);
        }
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    {this.state.error}
                </div>
            )
        }

        if (this.state.loading) {
            return (
                <div>Loading...</div>
            )
        }

        return (
            <div>
                <div style={{ padding : 20, marginRight: 280 }}>
                    <TextField initialValue={this.state.post.title[0]} placeholder="Publication headline" placeholderType="inside" wrapstyle={{ marginBottom: 6 }} style={{ fontFamily : '"Oswald", sans-serif', background : "transparent", fontSize : 32, border : "none", borderBottom : "1px solid #DDD", padding : "3px 0px", textAlign : 'center' }} />
                    <TextField initialValue={this.state.post.subtitle[0]} placeholder="Subtitle or catchline" placeholderType="inside" style={{ background : "transparent", border : "none", padding : "5px 0px", marginBottom : 10, textAlign : 'center' }} />
                    
                    <div style={{ maxWidth: 800, margin: "auto" }}>
                        <TextEditor content={this.state.post.content[0]}></TextEditor>
                    </div>
                </div>

                <div style={{ position : "fixed", right : 0, top : 50, bottom : 0, width : 280, background : "rgb(238, 226, 241)", boxShadow : "1px 0px 2px 2px rgba(154, 145, 156, 0.46)" }}>
                    <PublishingSidebar post={this.state.post}  />
                </div>
            </div>
        )
    }
}