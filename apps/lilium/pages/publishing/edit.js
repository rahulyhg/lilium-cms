import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import { setPageCommands } from '../../layout/lys';
import { TextEditor } from '../../widgets/texteditor';
import { TextField, ButtonWorker, CheckboxField, MultitagBox } from '../../widgets/form';
import { getSession } from '../../data/cache';
import { castNotification } from '../../layout/notifications';

import dateFormat from 'dateformat';

import API from "../../data/api";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';

const styles = {
    sidebarTitle : {
        padding: 10,
        display: "block",
        borderBottom: "1px solid #d6ace8",        
        borderTop: "1px solid #d6ace8",
        color: "#4d2161",
        backgroundColor: "#e3c6ea"
    },
    spinner : {
        fontSize : 60,
        color : "rgb(170, 153, 185)",
        marginTop : 20
    }
}



class HistoryEntry extends Component {
    constructor(props) {
        super(props);
        this.actor = this.props.actor || {
            avatarURL : "/static/media/lmllogo.png",
            displayname : "Inactive author"
        };
    }

    createMessage() {
        switch (this.props.entry.type) {
            case "update":
                return "updated the " + this.props.entry.diffs.map(x => x.field).join(', ');
            case "published":
                return "published this article";
            case "unpublished":
                return "set this article back to draft";
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
            <div key={this.props.key} class={"history-entry history-entry-" + this.props.entry.type}>
                <div class="history-entry-avatar-wrap">
                    <img class="history-entry-avatar" src={this.actor.avatarURL} />
                </div>
                <div class="history-entry-text">
                    <b>{this.actor.displayname}</b>
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
            history : props.history || []
        };

        const cachedUsers = {};
        getSession("entities").forEach(x => {
            cachedUsers[x._id] = x;
        });
        this.cachedUsers = cachedUsers;
    }

    componentWillReceiveProps(props) {
        log('History', 'History widget received props, about to set state', 'detail');
        this.setState({ history : props.history });
    }
    
    render() {
        log('History', 'Rendering history with ' + this.state.history.length + ' entries', 'detail');
        return (
            <div>
                {
                    this.state.history.map(entry => (<HistoryEntry key={entry._id} entry={entry} actor={this.cachedUsers[entry.actor]} />))
                }

                <HistoryEntry entry={{
                    type : "created",
                    at : this.props.post.createdOn || this.props.post.date || 0
                }} actor={this.cachedUsers[this.props.post.createdBy]} />
            </div>
        );
    }
}

class PublishingSidebar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            post : props.post,
            actions : props.actions || [],
            history : props.history || []
        }
    }

    componentWillReceiveProps(props) {
        const newState = {};

        props.history && (newState.history = props.history);
        props.post && (newState.post = props.post);
        props.actions && (newState.actions = props.actions);

        this.setState(newState);
    }

    render() {
        if (!this.state.post) {
            return null;
        }

        return (
            <div>
                <b style={styles.sidebarTitle}>Manage</b>
                <div style={{ padding : 10 }}>
                    {this.state.actions}
                </div>

                <b style={styles.sidebarTitle}>Activity</b>
                <PublishingHistory post={this.state.post} history={this.state.history} />
            </div>
        );
    }
}

export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading : true,
            actions : [],
            lastEdit : undefined,

        };

        this.coldState = {};
        this.edits = {};

        this.socketArticleUpdateEvent_bound = this.socketArticleUpdateEvent.bind(this);
    }

    componentDidMount() {
        this.requestArticle(this.props.postid);
        bindRealtimeEvent('articleUpdate', this.socketArticleUpdateEvent_bound)
    }

    componentWillUnmount() {
        unbindRealtimeEvent('articleUpdate', this.socketArticleUpdateEvent_bound);
    }

    socketArticleUpdateEvent(ev) {
        if (ev.by != liliumcms.session._id) {
            this.setState({ history : [ev.historyentry, ...this.state.history] });
            castNotification({
                type : "info",
                title : "Article was edited",
                message : "This article has just been edited by another user."
            })
        }
    }

    save(done) {
        const fieldCount = Object.keys(this.edits).length;

        if (fieldCount == 0) {
            castNotification({
                type : "info",
                title : "No modification",
                message : "This version of the article is the same as the one in the database."
            })

            done && done();
        } else {
            log('Publishing', 'Saving current post with id ' + this.props.postid, 'detail');

            API.put('/publishing/save/' + this.coldState.post._id, this.edits, (err, json, r) => {
                if (json && json.historyentry) {            
                    log('Publishing', 'Article saved!', 'success');

                    castNotification({
                        type : "success",
                        title : "Article saved",
                        message : "This article was successfully saved in the database."
                    })

                    this.setState({
                        history : [json.historyentry, ...this.state.history],
                        post : {...this.state.post, ...this.edits}
                    }, () => {
                        this.edits = {};
                        this.coldState.post = this.state.post;

                        done && done();
                    });
                } else {
                    castNotification({
                        type : "warning",
                        title : "Article did not save",
                        message : `[${r.status}] Error message from Lilium.`
                    })

                    done && done();
                }
            });
        }
    }

    publish(done) {
        this.save(() => {
            
        });
    }

    preview(done) {
        
    }

    commitchanges(done) {
        
    }

    requestArticle(postid, done) {
        this.setState({ loading : true });
        setPageCommands([ {
            command : "save",
            displayname : "Save Article",
            execute : this.save.bind(this)
        }]);

        const endpoints = {
            post : { endpoint : "/publishing/write/" + postid, params : {} },
            history : { endpoint : "/publishing/history/" + postid, params : {} }
        };

        API.getMany(Object.keys(endpoints).map(key => endpoints[key]), (err, resp) => {
            const post = resp[endpoints.post.endpoint];
            post ?
                log('Publishing', 'About to display : ' + post.headline, 'detail') :
                log('Publishing', 'Article not found : ' + postid, 'warn');
            
            this.coldState.post = post;
            this.setState(post ? { post, loading: false, actions : this.getActionFromColdState(), history : resp[endpoints.history.endpoint] } : { error : "Article not Found", loading : false }, () => {
                done && done();
            });
        });
    }

    getActionFromColdState() {
        const status = this.coldState.post.status;
        const actions = [<ButtonWorker text="Preview" work={this.preview.bind(this)} />];

        if (status == "draft" || status == "deleted") {
            actions.push(<ButtonWorker text="Save" work={this.save.bind(this)} />, <ButtonWorker text="Publish" work={this.publish.bind(this)} />);
        } else if (status == "published") {
            actions.push(<ButtonWorker text="Save" work={this.save.bind(this)} />, <ButtonWorker text="Commit changes" work={this.commitchanges.bind(this)} />);
        } 

        return actions;
    }

    fieldChanged(name, value) {
        this.edits[name] = value;
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
                <div style={{ textAlign : 'center', paddingTop : 150 }}>
                    <i class="far fa-spinner-third fa-spin-fast" style={styles.spinner}></i>
                </div>
            )
        }

        return (
            <div>
                <div style={{ padding : 20, marginRight: 280 }}>
                    <TextField onChange={this.fieldChanged.bind(this)} format={x => [x]} name="title" initialValue={this.state.post.title[0]} placeholder="Publication headline" placeholderType="inside" wrapstyle={{ marginBottom: 6 }} style={{ fontFamily : '"Oswald", sans-serif', background : "transparent", fontSize : 32, border : "none", borderBottom : "1px solid #DDD", padding : "3px 0px", textAlign : 'center' }} />
                    <TextField onChange={this.fieldChanged.bind(this)} format={x => [x]} name="subtitle" initialValue={this.state.post.subtitle[0]} placeholder="Subtitle or catchline" placeholderType="inside" style={{ background : "transparent", border : "none", padding : "5px 0px", marginBottom : 10, textAlign : 'center' }} />
                    
                    <div style={{ margin: "auto" }}>
                        <TextEditor onChange={this.fieldChanged.bind(this)} format={x => [x]} name="content" content={this.state.post.content[0]} />
                    </div>

                    <div class="card publishing-card">
                        <MultitagBox onChange={this.fieldChanged.bind(this)} name='tags' placeholder='Tags' initialValue={this.state.post.tags} />
                        <CheckboxField onChange={this.fieldChanged.bind(this)} name='sticky' placeholder='Make this article sticky' initialValue={this.state.post.sticky} />
                        <CheckboxField onChange={this.fieldChanged.bind(this)} name='nsfw' placeholder='Not safe for work (NSFW)' initialValue={this.state.post.nsfw} />
                    </div>

                    <div class="card publishing-card">
                        <CheckboxField onChange={this.fieldChanged.bind(this)} name='isSponsored' placeholder='This is a sponsored post' initialValue={this.state.post.isSponsored} />
                    </div>
                </div>

                <div style={{ position : "fixed", right : 0, top : 50, bottom : 0, width : 280, overflow : "auto", background : "rgb(238, 226, 241)", boxShadow : "1px 0px 2px 2px rgba(154, 145, 156, 0.46)" }}>
                    <PublishingSidebar post={this.state.post} actions={this.state.actions} history={this.state.history} />
                </div>
            </div>
        )
    }
}