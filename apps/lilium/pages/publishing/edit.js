import { h, Component } from 'preact';
import { setPageCommands } from '../../layout/lys';
import { getTimeAgo } from '../../widgets/timeago';
import { TextEditor } from '../../widgets/texteditor';
import { TextField, ButtonWorker, CheckboxField, MultitagBox, MediaPickerField, TopicPicker, SelectField } from '../../widgets/form';
import { EditionPicker } from '../../widgets/editionpicker';
import { getSession } from '../../data/cache';
import { navigateTo } from '../../routing/link';
import { castNotification } from '../../layout/notifications';
import { Spinner } from '../../layout/loading';
import { Picker } from '../../layout/picker';
import { castOverlay } from '../../overlay/overlaywrap';
import { hit } from '../../realtime/connection';
import Modal from '../../widgets/modal';
import dateFormat from 'dateformat';
import { savePost, validatePost, getPostForEdit, refreshPost, destroyPost, refusePost, submitPostForApproval, publishPost, unpublishPost, getPublicationReport, updatePostSlug, getNewPreviewLink, addPostToSeries } from '../../lib/publishing';
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';

const styles = {
    sidebarTitle : {
        padding: 10,
        display: "block",
        borderBottom: "1px solid #F6F6F6",        
        borderTop: "1px solid #F6F6F6",
        color: "#333",
        backgroundColor: "#EEE"
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

    clicked(ev) {
        if (this.props.entry.hasdiff) {
            this.props.onClick({ entry : this.props.entry });
        }
    }

    render() {
        return (
            <div key={this.props.key} class={"history-entry history-entry-" + this.props.entry.type} style={{ cursor: this.props.entry.hasdiff ? "pointer" : "default" }} onClick={this.clicked.bind(this)}>
                <div class="history-entry-avatar-wrap">
                    <img class="history-entry-avatar" src={this.actor.avatarURL} />
                </div>
                <div class="history-entry-text">
                    <b>{this.actor.displayname}</b>
                    <span> { this.createMessage() } </span>
                    <div class="history-entry-date">{ dateFormat(new Date(this.props.entry.at), 'HH:MM, dddd mmm yyyy') }</div>
                </div>
                {this.props.entry.hasdiff ? (<i class="far fa-history history-icon"></i>) : null}
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

    entryClicked(entryev) {
        this.props.entryClicked(entryev);
    }
    
    render() {
        log('History', 'Rendering history with ' + this.state.history.length + ' entries', 'detail');
        return (
            <div>
                {
                    this.state.history.map(entry => (<HistoryEntry onClick={this.entryClicked.bind(this)} key={entry._id} entry={entry} actor={this.cachedUsers[entry.actor]} />))
                }

                <HistoryEntry entry={{
                    type : "created",
                    at : this.props.post.createdOn || this.props.post.date || 0
                }} actor={this.cachedUsers[this.props.post.createdBy]} />
            </div>
        );
    }
}

class PublishingActions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            post: props.post,
            destroyModalVisible: false
        }
    }

    componentWillReceiveProps(props) {
        const newState = {};

        props.post && (newState.post = props.post);

        this.setState(newState);
    }

    makeButtonSection() {
        const acts = [];
        const dropacts = [];
        const status = this.state.post.status;

        if (liliumcms.session.roles.includes('contributor')) {
            if (status == "draft" || status == "deleted" || status == "refused") {
                acts.push(
                    <ButtonWorker theme="green" type="fill" text="Save" work={this.props.actions.save.bind(this)} />
                );

                dropacts.push(
                    { color : "blue", text : "Submit for approval", work : this.props.actions.submitForApproval.bind(this)  },
                    { color : "red", text : "Destroy", work : this.props.actions.destroy.bind(this) }
                );
            } 
        } else {
            if (status == "draft" || status == "deleted") {
                acts.push(
                    <ButtonWorker theme="green" type="fill" text="Save" work={this.props.actions.save.bind(this)} />
                );

                dropacts.push(
                    { color : "blue", text : "Publish", work : this.props.actions.validate.bind(this)  },
                    { color : "black", text : "Change author", work : this.props.actions.triggerAuthorChange.bind(this) },
                    { color : "black", text : "Change slug", work : this.props.actions.triggerSlugChange.bind(this) },
                    { color : "black", text : "Invalidate preview link", work : this.props.actions.triggerPreviewLinkChange.bind(this) },
                    { color : "red", text : "Destroy", work : this.props.actions.destroy.bind(this) }
                );
            } else if (status == "published") {
                acts.push(
                    <ButtonWorker theme="green"  type="fill" text="Update" work={this.props.actions.commitchanges.bind(this)} />
                );

                dropacts.push(
                    { color : "black", text : "Change author", work : this.props.actions.triggerAuthorChange.bind(this) },
                    { color : "black", text : "Change slug", work : this.props.actions.triggerSlugChange.bind(this) },
                    { color : "black", text : "Add to series", work : this.props.actions.triggerAddToSeries.bind(this) },
                    { color : "black", text : "Invalidate preview link", work : this.props.actions.triggerPreviewLinkChange.bind(this) },
                    { color : "red", text : "Unpublish", work : this.props.actions.unpublish.bind(this) }
                );
            } else if (status == "reviewing") {
                acts.push(
                    <ButtonWorker theme="white" text="Save" work={this.props.actions.save.bind(this)} />
                );

                dropacts.push(
                    { color : "blue", text : "Accept and publish", work : this.props.actions.validate.bind(this)  },
                    { color : "black", text : "Change author", work : this.props.actions.triggerAuthorChange.bind(this) },
                    { color : "black", text : "Change slug", work : this.props.actions.triggerSlugChange.bind(this) },
                    { color : "black", text : "Invalidate preview link", work : this.props.actions.triggerPreviewLinkChange.bind(this) },
                    { color : "red", text : "Refuse submission", work : this.props.actions.refuse.bind(this) }
                );
            }
        }

        return { actions : acts, dropdownActions : dropacts.filter(x => !x.hidden) };
    }

    destroyArticle(done) {
        this.props.actions.destroy(done);
        this.setState({ destroyModalVisible: false });
    }

    render() {
        const actionSection = this.makeButtonSection();
        return (
            <div>
                <div>
                    <ButtonWorker theme="white" text="Preview" work={this.props.actions.preview.bind(this)} />
                    {actionSection.actions}
                    { actionSection.dropdownActions.length != 0 ? 
                        <PublishingActionMore actions={actionSection.dropdownActions} /> : 
                    null }
                </div>
            </div>
        )
    }
}

class PublishingActionMore extends Component {
    constructor(props) {
        super(props);
        this.state = {
            actions : props.actions || []
        }

        this.maybeClose_bound = this.maybeClose.bind(this);
    }

    maybeClose(ev) {
        !this.el.contains(ev.target) && this.el != ev.target && this.close();
    }

    open()   { this.setState({ open : true }); document.addEventListener('click', this.maybeClose_bound); }
    close()  { this.setState({ open : false }); document.removeEventListener('click', this.maybeClose_bound); }

    toggle() {
        this.state.open ? this.close() : this.open();
    }

    componentWillReceiveProps(props) {
        this.setState({ actions : props.actions })
    }

    componentWillUnmount() {
        this.close();
    }

    render() {
        return (
            <div class="publishing-more-actions-box" ref={x => (this.el = x)}>
                <div class="publishing-more-actions-ellipsis button-worker white" onClick={this.toggle.bind(this)}><i class="far fa-ellipsis-h"></i></div>
                { this.state.open ? (
                    <div class="publishing-more-actions-dropdown">
                        { this.state.actions.map(x => (
                            <PublishingActionMoreSingle onClose={this.close.bind(this)} work={x.work} color={x.color} text={x.text} />
                        )) }
                    </div>
                ) : null }
            </div>
        );
    }
}

class PublishingActionMoreSingle extends Component {
    constructor(props) {
        super(props);
    }

    onClick() {
        this.setState({ working : true }, () => {
            this.props.work(() => {
                this.setState({ working : false });
                this.props.onClose();
            });
        })
    }

    render() {
        if (this.state.working) {
            return (<div class="publishing-more-actions"><i class="far fa-spinner-third fa-spin"></i></div>);
        }

        return (
            <div onClick={this.onClick.bind(this)} class={"publishing-more-actions " + this.props.color}>{this.props.text}</div>
        );
    }
}

class PublishingSidebar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            post : props.post,
            history : props.history || []
        }
    }

    componentWillReceiveProps(props) {
        const newState = {};

        props.history && (newState.history = props.history);
        props.post && (newState.post = props.post);

        this.setState(newState);
    }

    entryClicked(entryev) {
        this.props.historyEntryClicked(entryev);
    }

    render() {
        if (!this.state.post) {
            return null;
        }
        
        const timeAgo = this.props.history[0] && getTimeAgo(Date.now() - new Date(this.props.history[0].at).getTime()).toString();
        
        return (
            <div>
                <b style={styles.sidebarTitle}>Manage</b>
                <div style={{ padding : 10 }}>
                    <PublishingActions post={this.state.post} actions={this.props.actions} />

                    <div id="sidebar-info">
                        <div>
                            <span id="word-count"><b>Word Count</b>: <span>{this.state.post.wordcount || 0}</span></span>
                        </div>
                        {
                            timeAgo ? (
                                <div>
                                    <span className="last-modified-interval"><b>Last Modified</b>: <span>{timeAgo}</span></span>
                                </div>
                            ) : null
                        }
                        <div>
                            <span id="status"><b>Status</b>: <span>{this.state.post.status}</span></span>
                        </div>
                    </div>
                </div>

                <b style={styles.sidebarTitle}>Activity</b>
                <PublishingHistory post={this.state.post} history={this.state.history} entryClicked={this.entryClicked.bind(this)} />
            </div>
        );
    }
}

class PublishingSponsoredSection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            open : !!props.post.isSponsored,
            openfurther : !!props.post.useSponsoredBox
        }
    }

    fieldChanged(name, value) {
        if (name == "isSponsored") {
            this.setState({ open : value });
        } else if (name == "useSponsoredBox") {
            this.setState({ openfurther : value });
        }

        this.props.post[name] = value;
        this.props.fieldChanged(name, value);
    }

    imageChanged(name, value) {
        this.props.post.sponsoredBoxLogo = value._id;
        this.props.fieldChanged(name, value._id);
    }

    render() {
        return (
            <div>
                <CheckboxField onChange={this.fieldChanged.bind(this)} name='isSponsored' placeholder='This is a sponsored post' initialValue={!!this.props.post.isSponsored} />
                
                {
                    this.state.open ? (
                        <div>
                            <TextField onChange={this.fieldChanged.bind(this)} name="sponsoredCampaignID" initialValue={this.props.post.sponsoredCampaignID} placeholder="Sponsored Campaign ID" />
                            <CheckboxField onChange={this.fieldChanged.bind(this)} name='useSponsoredBox' placeholder='Use Sponsored Box' initialValue={!!this.props.post.useSponsoredBox} />
                            {
                                this.state.openfurther ? (
                                    <div>
                                        <TextField onChange={this.fieldChanged.bind(this)} name="sponsoredBoxTitle" initialValue={this.props.post.sponsoredBoxTitle} placeholder="Sponsored Box Title" />
                                        <TextField onChange={this.fieldChanged.bind(this)} name="sponsoredBoxURL" initialValue={this.props.post.sponsoredBoxURL} placeholder="Sponsored Box URL" />
                                        <TextField onChange={this.fieldChanged.bind(this)} name="sponsoredBoxContent" initialValue={this.props.post.sponsoredBoxContent} placeholder="Sponsored Box Content" multiline={true} />
                                        <MediaPickerField name="sponsoredBoxLogo" placeholder="Select a logo" initialValue={this.props.post.sponsoredBoxLogo} onChange={this.imageChanged.bind(this)} size="small" />
                                    </div>
                                ) : null
                            }
                        </div>
                    ) : null
                }
            </div>
        )
    }
}

class PostDetails extends Component {
    constructor(props) {
        super(props);

        const cachedUsers = {};
        getSession("entities").forEach(x => {
            cachedUsers[x._id] = x;
        });
        this.cachedUsers = cachedUsers;

        this.stage = {};
    }

    render() {
        return (
            <div class="publication-details-card">
                <div class="detail-head">
                    <b>About this article</b>
                </div>

                <div class="detail-list">
                    <div>
                        Created <b>{getTimeAgo(Date.now() - new Date(this.props.post.createdOn).getTime()).toString()}</b> by <b>{this.cachedUsers[this.props.post.createdBy] ? this.cachedUsers[this.props.post.createdBy].displayname : " an inactive user"}</b>.
                    </div>
                    { this.props.post.updated ? (
                        <div>
                            Updated <b>{getTimeAgo(Date.now() - new Date(this.props.post.updated).getTime()).toString()}</b>.
                        </div>
                    ) : null }
                    { this.props.post.wordcount ? (
                        <div>
                            <b>{this.props.post.wordcount} words</b> piece.
                        </div>
                    ) : null}
                    { this.props.post.date && this.props.post.status == "published" ? (
                        <div>
                            Published <b>{getTimeAgo(Date.now() - new Date(this.props.post.date).getTime()).toString()}</b> by <b>{this.cachedUsers[this.props.post.author] ? this.cachedUsers[this.props.post.author].displayname : " an inactive user"}</b>.
                        </div>
                    ) : null}
                    { this.props.post.url && this.props.post.status == "published" ? (
                        <div>
                            URL : <a href={this.props.post.url} target="_blank">{this.props.post.url}</a>
                        </div>
                    ) : null}
                    { this.props.post.aliases && this.props.post.aliases.length != 0 ? (
                        <div>
                            <div><b>Alias slugs :</b></div>
                            {this.props.post.aliases.map(a => (<div>{a}</div>))}
                        </div>
                    ) : null}
                </div>
            </div>
        )
    }
}

export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading : true,
            lastEdit : undefined
        };

        this.actions = {
            preview : this.preview.bind(this),
            save : this.save.bind(this),
            submitForApproval : this.submitForApproval.bind(this),
            destroy : () => this.setState({ destroyModalVisible : true }), 
            validate : this.validate.bind(this),
            triggerAuthorChange : this.triggerAuthorChange.bind(this),
            triggerSlugChange : this.triggerSlugChange.bind(this),
            triggerPreviewLinkChange : this.triggerPreviewLinkChange.bind(this),
            triggerAddToSeries : this.triggerAddToSeries.bind(this),
            commitchanges : this.commitchanges.bind(this),
            unpublish : this.unpublish.bind(this),
            refuse : this.refuse.bind(this)
        };

        this.coldState = {};
        this.edits = {};
        this.modalStage = {};
        this.stage = {};

        this.socketArticleUpdateEvent_bound = this.socketArticleUpdateEvent.bind(this);
        this.onPageKeyPress = this.onPageKeyPress.bind(this);
    }

    componentDidMount() {
        this.requestArticle(this.props.postid);
        bindRealtimeEvent('articleUpdate', this.socketArticleUpdateEvent_bound);
    }

    componentWillUnmount() {
        unbindRealtimeEvent('articleUpdate', this.socketArticleUpdateEvent_bound);
    }

    onPageKeyPress(ev) {
        console.log(ev);
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

            savePost(this.coldState.post._id, this.edits, (err, { historyentry }, r) => {
                if (historyentry) {            
                    log('Publishing', 'Article saved!', 'success');

                    castNotification({
                        type : "success",
                        title : "Article saved",
                        message : "This article was successfully saved in the database."
                    })

                    this.setState({
                        history : [historyentry, ...this.state.history],
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

    validate(done) {
        this.save(() => {
            const missingFields = [];
            if (!this.coldState.post.title[0])      { missingFields.push("a title");  }
            if (!this.coldState.post.subtitle[0])   { missingFields.push("a subtitle");  } 
            if (!this.coldState.post.author)        { missingFields.push("an author");  } 
            if (!this.coldState.post.media)         { missingFields.push("a featured image");  } 

            if (missingFields.length != 0) {
                castNotification({ type : "warning", title : "Missing field", message : "The article requires " + missingFields.join(', ') + "." })
                done && done();
            } else {
                validatePost(this.coldState.post._id, (err, { valid }) => {
                    if (!err && valid) {
                        castOverlay('publish-article', {
                            publishFunction : this.publish.bind(this),
                            getReportFunction : this.getReport.bind(this)
                        });
                    } else {
                        castNotification({
                            type : "warning",
                            title : "Could not publish article",
                            message : err
                        });
                    }
    
                    done && done();
                });     
            }       
        });
    }

    getReport(sendback) {
        getPublicationReport(this.coldState.post._id, (err, report) => sendback(err, report));
    }

    publish(done) {
        publishPost(this.coldState.post._id, (err, { historyentry, newstate }, r) => {
            if (!err) {
                hit();
                this.setState({
                    history : [historyentry, ...this.state.history],
                    post : {...this.state.post, ...{
                        status : newstate.status,
                        date : newstate.date,
                        name : newstate.name,
                        publishedAt : Date.now()
                    }}
                }, () => {
                    this.coldState.post = this.state.post; 

                    done(r.status);    
                });
            } else {
                const message = r.responseText;
                castNotification({
                    type : "warning",
                    title : "Could not publish article",
                    message
                });

                done(r.status, message);
            }
        });
    }

    unpublish(done) {
        unpublishPost(this.coldState.post._id, (err, { historyentry, newstate }, r) => {
            if (!err) {
                this.setState({
                    history : [historyentry, ...this.state.history],
                    post : {...this.state.post, ...{
                        status : newstate.status,
                        date : newstate.date,
                        name : newstate.name,
                        publishedAt : Date.now()
                    }}
                }, () => {
                    this.coldState.post = this.state.post; 
                });
            } else {
                const message = r.responseText;
                castNotification({
                    type : "warning",
                    title : "Could not unpublish article",
                    message
                });
            }

            done && done();
        });
    }

    preview(done) {
        this.save(() => {
            const loc = liliumcms.url + "/preview/" + this.props.postid + "/" + (this.state.post.previewkey || "");
            try {
                if (this.previewWindow && !this.previewWindow.closed) {
                    this.previewWindow.document.location = loc;
                    this.previewWindow.focus();
                } else  {
                    this.previewWindow = window.open(loc);
                }
            } catch (err) {
                this.previewWindow = window.open(loc);
            }

            done && done();
        });        
    }

    submitForApproval(done) {
        this.save(() => {
            validatePost(this.coldState.post._id, (err, { valid }, r) => {
                if (!err && valid) {  
                    submitPostForApproval(this.coldState.post._id, (err, json, r) => {
                        if (!err) {
                            castNotification({
                                type : "success",
                                title : "Article sent",
                                message : "Your article was successfully sent for approval."
                            });
                            navigateTo("/publishing");
                        } else {
                            castNotification({
                                type : "warning",
                                title : "Could not send article for approval",
                                message : err
                            });
                        }

                        done && done();
                    });
                } else {
                    castNotification({
                        type : "warning",
                        title : "Could not send article for approval",
                        message : err
                    });
                    done && done();
                }

            });
        })
    }

    refuse(done) {
        refusePost(this.coldState.post._id, (err, json, r) => {
            if (!err) {
                castNotification({
                    type : "success",
                    title : "Article refused",
                    message : "This article has been sent back to the writer. They will now be able to edit it."
                });

                navigateTo("/publishing");
            } else {
                castNotification({
                    type : "warning",
                    title : "Could not refuse submission",
                    message : err
                });
            }

            done && done();
        });
    }

    destroy(done) {
        destroyPost(this.coldState.post._id, (err, json, r) => {
            if (!err) {
                castNotification({
                    type : "success",
                    title : "Article destroyed",
                    message : "This article will no longer appear in the list of articles."
                });
                
                navigateTo("/publishing");
            } else {
                castNotification({
                    type : "warning",
                    title : "Could not destroy article",
                    message : err
                });
            }

            done && done();
        });
    }

    commitchanges(done) {
        this.save(() => {
            refreshPost(this.coldState.post._id, (err, { historyentry, newstate }, r) => {
                if (!err) {
                    castNotification({
                        type : "success",
                        title : "Article refreshed",
                        message : "The article was successfully updated, and the changes should appear on the website."
                    });
                } else {
                    castNotification({
                        type : "error",
                        title : "Could not commit changes",
                        message : err
                    });
                }

                if (historyentry && newstate) {
                    this.setState({
                        post : {...this.state.post, ...newstate},
                        history : [historyentry, ...this.state.history],
                    }, () => done && done());
                } else {
                    done && done();
                }
            });
        });
    }

    requestArticle(postid, done) {
        this.setState({ loading : true });
        setPageCommands([ {
            command : "save",
            displayname : "Save Article",
            execute : this.save.bind(this)
        }]);

        getPostForEdit(postid, ({ post, history }) => {
            post ?
                log('Publishing', 'About to display : ' + post.headline, 'detail') :
                log('Publishing', 'Article not found : ' + postid, 'warn');
            
            this.coldState.post = post;
            this.setState(post ? { loading: false, post, history } : { error : "Article not Found", loading : false }, () => {
                done && done();
            });
        });
    }

    editionChanged(name, value) {
        this.edits[name] = value;
        const post = this.state.post;
        post.editions = value;

        this.setState({ post });
    }

    fieldChanged(name, value) {
        this.edits[name] = value;
        const post = this.state.post;
        post[name] = value;

        this.setState({ post });
    }

    contentChanged(name, value) {
        this.edits[name] = [value];

        const tempdiv = document.createElement('div');
        tempdiv.innerHTML = value;

        this.edits.wordcount = [
            ...Array.from(tempdiv.querySelectorAll('p')).map(p => p.textContent.split(' ').length),
            ...Array.from(tempdiv.querySelectorAll('h3')).map(p => p.textContent.split(' ').length),
            ...Array.from(tempdiv.querySelectorAll('h2')).map(p => p.textContent.split(' ').length),
            ...Array.from(tempdiv.querySelectorAll('h1')).map(p => p.textContent.split(' ').length),
        ].reduce((prev, cur) => prev + cur, 0);

        tempdiv.innerHTML = "";

        this.save();
    }

    imageChanged(name, image) {
        if (image) {
            this.edits.media = image._id;
            this.edits.facebookmedia = image.sizes.facebook.url;
            const post = this.state.post;
            post.media = image._id;

            this.setState({ post });
        }
    }

    componentWillReceiveProps(props) {
        if (props.postid) {
            this.requestArticle(props.postid);
        }
    }

    historyEntryClicked(entryev) {
        castOverlay('restore-article', { 
            historyentry : entryev.entry, 
            content : this.edits.content || this.state.post.content,
            overwriteCallback : patch => {
                const post = this.state.post;
                post.content[0] = patch;
                this.edits.content = post.content;
                this.setState({ post });
            }
        });
    }

    triggerAuthorChange() {
        this.setState({
            updatingAuthor : true,
            updatingSlug : false
        });
    }

    triggerSlugChange() {
        this.setState({
            updatingSlug : true,
            updatingAuthor : false
        });        
    }

    triggerPreviewLinkChange(done) {
         getNewPreviewLink(this.state.post._id, (err, { previewkey }, r) => {
            if (!err) {
                const post = this.state.post;
                post.previewkey = previewkey;

                this.setState({ post })

                castNotification({
                    type : "success",
                    title : "Preview link",
                    message : "The old preview links are no longer available."
                });
            } else {
                castNotification({
                    type : "warning",
                    title : "Could not invalidate preview link"
                })         
            }

            done && done(); 
        });
    }

    // TODO : TOFINISH
    triggerAddToSeries(done) {
        Picker.cast({
            accept : ["chain"],
            options : {
                chain : {
                    selected : undefined
                }
            }
        }, resp => {
            if (resp && resp.chain) {
                addPostToSeries(this.state.post._id, resp.chain._id, (err, resp) => {
                    if (err) {
                        castNotification({
                            type : "warning",
                            title : "Add to content chain",
                            message : "This article could not be added to the content chain."
                        });
                    } else {
                        castNotification({
                            type : "success",
                            title : "Add to content chain",
                            message : "This article was successfully added to the content chain."
                        });
                    }
                });
            } else {
                done && done();
            }
        });
    }

    updateAuthor() {
        this.handleDetailsAction("author", this.stage.author);
        this.setState({
            updatingSlug : false,
            updatingAuthor : false
        });
    }

    updateSlug() {
        this.handleDetailsAction("name", this.stage.name);
        this.setState({
            updatingSlug : false,
            updatingAuthor : false
        });
    }

    handleDetailsAction(field, value) {
        if (field == "name") {
            updatePostSlug(this.state.post._id, value, (err, json, r) => {
                if (err) {
                    castNotification({
                        type : "warning",
                        title : "Could not edit URL slug",
                        message : err
                    })
                } else {
                    castNotification({
                        type : "success",
                        title : "URL slug",
                        message : "The URL slug was successfully modified."
                    });

                    const post = this.state.post;
                    if (post.aliases) {
                        post.aliases.push(post.name);
                    }

                    post.name = value;
                    if (post.url) {
                        post.url = document.location.protocol + liliumcms.url + "/" + post.topicslug + "/" + value;
                    }

                    this.setState({ post });
                }
            });
        } else if (field == "author") {
            this.edits.author = value;
            this.save();
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
                    <Spinner centered />
                </div>
            )
        }

        return (
            <div class="publishing-page-flex">
                <div class="publishing-edit-section">
                    <div class="publishing-bigtitle-wrap">
                        <TextField onChange={this.fieldChanged.bind(this)} format={x => [x]} name="title" initialValue={this.state.post.title[0]} placeholder="Publication headline" placeholderType="inside" wrapstyle={{ marginBottom: 6 }} />
                    </div>

                    <div class="publishing-subtitle-wrap">
                        <TextField onChange={this.fieldChanged.bind(this)} format={x => [x]} name="subtitle" initialValue={this.state.post.subtitle[0]} placeholder="Subtitle or catchline" placeholderType="inside" />
                    </div>
                    
                    <div style={{ margin: "auto", maxWidth: 1200 }}>
                        <TextEditor onChange={this.contentChanged.bind(this)} name="content" content={this.state.post.content[0]} />
                    </div>

                    <div class="card publishing-card">
                        <MediaPickerField name="media" placeholder="Featured image" initialValue={this.state.post.media} onChange={this.imageChanged.bind(this)} />
                    </div>

                    <div class="card publishing-card">
                        <SelectField name="language" placeholder="Language" initialValue={this.state.post.language || "en"} value={this.state.post.language || "en"} onChange={this.fieldChanged.bind(this)} options={[
                            { text : "English", value : "en" },
                            { text : "Français", value : "fr" }
                        ]} />
                    </div>      

                    <div class="card publishing-card nopad">
                        <EditionPicker language={this.state.post.language || "en"} initialValue={this.state.post.editions || []} name="editions" value={this.state.post.editions} placeholder="Edition" onChange={this.editionChanged.bind(this)} />
                    </div>      

                    <div className="card publishing-card" id="seo">
                        <TextField name='seotitle' placeholder='SEO Optimised Title' onChange={this.fieldChanged.bind(this)} initialValue={this.state.post.seotitle} />
                        <TextField name='seosubtitle' placeholder='SEO Optimized Subtitle' onChange={this.fieldChanged.bind(this)} initialValue={this.state.post.seosubtitle} />
                    </div>

                    <div class="card publishing-card">
                        <MultitagBox onChange={this.fieldChanged.bind(this)} name='tags' placeholder='Tags' initialValue={this.state.post.tags} />
                        <CheckboxField onChange={this.fieldChanged.bind(this)} name='sticky' placeholder='Make this article sticky' initialValue={this.state.post.sticky} />
                        <CheckboxField onChange={this.fieldChanged.bind(this)} name='nsfw' placeholder='Not safe for work (NSFW)' initialValue={this.state.post.nsfw} />
                        <CheckboxField onChange={this.fieldChanged.bind(this)} name='hidden' placeholder='Only available via URL' initialValue={this.state.post.hidden} />
                    </div>

                    <div class="card publishing-card">
                        <PublishingSponsoredSection fieldChanged={this.fieldChanged.bind(this)} post={this.state.post} />
                    </div>

                    <div class="card publishing-card nopad">
                        <PostDetails post={this.state.post} onAction={this.handleDetailsAction.bind(this)} />
                    </div>
                </div>

                <div class="publishing-sidebar">
                    <PublishingSidebar post={this.state.post} actions={this.actions} history={this.state.history} historyEntryClicked={this.historyEntryClicked.bind(this)} />
                </div>

                <Modal visible={this.state.updatingSlug} title='Update slug' onClose={ () => this.setState({ updatingSlug : false }) }>
                    <TextField name='name' placeholder='URL Slug' onChange={(name, val) => { this.stage[name] = val; }} initialValue={this.state.post.name} />
                    <ButtonWorker text='Update' work={this.updateSlug.bind(this)} />
                </Modal>

                <Modal visible={this.state.updatingAuthor} title='Update author' onClose={ () => this.setState({ updatingAuthor : false }) }>
                    <SelectField name='author' placeholder='Author' onChange={(name, val) => { this.stage[name] = val; }} initialValue={this.state.post.author} options={
                        getSession("entities").map(user => ({ value : user._id, displayname : user.displayname }))
                    } />
                    <ButtonWorker text='Update' work={this.updateAuthor.bind(this)} />
                </Modal>

                <Modal title='Destroy this article?' visible={this.state.destroyModalVisible} onClose={() => { this.setState({ destroyModalVisible: false }) }}>
                    <p>Are you sure you want to <b>destroy</b> this article permanently?</p>
                    <ButtonWorker theme="red"  type="fill" text="Yes, destroy" work={this.destroy.bind(this)} />
                    <ButtonWorker theme="blue"  type="outline" text="No, I want to keep it" sync={true} work={() => { this.setState({ destroyModalVisible: false }) }} />
                </Modal>

            </div>
        )
    }
}
