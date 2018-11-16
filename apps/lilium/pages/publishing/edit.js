import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import { setPageCommands } from '../../layout/lys';
import { TextEditor } from '../../widgets/texteditor';
import { TextField, ButtonWorker, CheckboxField, MultitagBox, MediaPickerField, TopicPicker, SelectField } from '../../widgets/form';
import { getSession } from '../../data/cache';
import { navigateTo } from '../../routing/link';
import { castNotification } from '../../layout/notifications';
import { castOverlay } from '../../overlay/overlaywrap';
import { hit } from '../../realtime/connection';
import Modal from '../../widgets/modal';

import dateFormat from 'dateformat';
import { getTimeAgo } from '../../widgets/timeago';

import API from "../../data/api";
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
            post : props.post
        }
    }

    componentWillReceiveProps(props) {
        const newState = {};

        props.post && (newState.post = props.post);

        this.setState(newState);
    }

    makeButtonSection() {
        const acts = [];
        const status = this.state.post.status;

        if (liliumcms.session.roles.includes('contributor')) {
            if (status == "draft" || status == "deleted" || status == "refused") {
                acts.push(
                    <ButtonWorker theme="white" text="Save" work={this.props.actions.save.bind(this)} />, 
                    <ButtonWorker type="fill" theme="blue" text="Submit for approval" work={this.props.actions.submitForApproval.bind(this)} />,
                    <ButtonWorker theme="red"  type="outline" text="Destroy" work={this.props.actions.destroy.bind(this)} />
                );
            } 
        } else {
            if (status == "draft" || status == "deleted") {
                acts.push(
                    <ButtonWorker theme="white" text="Save" work={this.props.actions.save.bind(this)} />, 
                    <ButtonWorker theme="red"  type="outline" text="Destroy" work={this.props.actions.destroy.bind(this)} />,
                    <ButtonWorker type="fill" theme="blue" text="Publish" work={this.props.actions.validate.bind(this)} />
                );
            } else if (status == "published") {
                acts.push(
                    <ButtonWorker theme="blue"  type="fill" text="Commit changes" work={this.props.actions.commitchanges.bind(this)} />, 
                    <ButtonWorker theme="red"  type="outline" text="Unpublish" work={this.props.actions.unpublish.bind(this)} />
                );
            } else if (status == "reviewing") {
                acts.push(
                    <ButtonWorker theme="white" text="Save" work={this.props.actions.save.bind(this)} />, 
                    <ButtonWorker type="fill" theme="blue" text="Approve and publish" work={this.props.actions.validate.bind(this)} />,
                    <ButtonWorker theme="red"  type="outline" text="Refuse submission" work={this.props.actions.refuse.bind(this)} />
                );
            }
        }

        return acts;
    }

    render() {
        return (
            <div>
                <div>
                    <ButtonWorker theme="white" text="Preview" work={this.props.actions.preview.bind(this)} />
                </div>
                <div>
                    {this.makeButtonSection()}
                </div>
            </div>
        )
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

        return (
            <div>
                <b style={styles.sidebarTitle}>Manage</b>
                <div style={{ padding : 10 }}>
                    <PublishingActions post={this.state.post} actions={this.props.actions} />
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

        this.state.post = props.post;
        const cachedUsers = {};
        getSession("entities").forEach(x => {
            cachedUsers[x._id] = x;
        });
        this.cachedUsers = cachedUsers;

        this.stage = {};
    }

    componentWillReceiveProps(props) {
        if (props.post) {
            this.setState({
                post : props.post
            })
        }
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

    triggerPreviewLinkInvalidation() {
        this.props.onAction('previewkey');
    }

    updateAuthor() {
        this.props.onAction("author", this.stage.author);
        this.setState({
            updatingSlug : false,
            updatingAuthor : false
        });
    }

    updateSlug() {
        this.props.onAction("name", this.stage.name);
        this.setState({
            updatingSlug : false,
            updatingAuthor : false
        });
    }

    render() {
        return (
            <div class="publication-details-card">
                <div class="detail-head">
                    <b>About this article</b>
                </div>

                <div class="detail-list">
                    <div>
                        Created <b>{getTimeAgo(Date.now() - new Date(this.state.post.createdOn).getTime()).toString()}</b> by <b>{this.cachedUsers[this.state.post.createdBy] ? this.cachedUsers[this.state.post.createdBy].displayname : " an inactive user"}</b>.
                    </div>
                    { this.state.post.updated ? (
                        <div>
                            Updated <b>{getTimeAgo(Date.now() - new Date(this.state.post.updated).getTime()).toString()}</b>.
                        </div>
                    ) : null }
                    { this.state.post.wordcount ? (
                        <div>
                            <b>{this.state.post.wordcount} words</b> piece.
                        </div>
                    ) : null}
                    { this.state.post.date && this.state.post.status == "published" ? (
                        <div>
                            Published <b>{getTimeAgo(Date.now() - new Date(this.state.post.date).getTime()).toString()}</b> by <b>{this.cachedUsers[this.state.post.author] ? this.cachedUsers[this.state.post.author].displayname : " an inactive user"}</b>.
                        </div>
                    ) : null}
                    { this.state.post.url && this.state.post.status == "published" ? (
                        <div>
                            URL : <a href={this.state.post.url} target="_blank">{this.state.post.url}</a>
                        </div>
                    ) : null}
                    { this.state.post.aliases && this.state.post.aliases.length != 0 ? (
                        <div>
                            <div><b>Alias slugs :</b></div>
                            {this.state.post.aliases.map(a => (<div>/{a}</div>))}
                        </div>
                    ) : null}
                </div>

                <footer>
                    <span class="clickable" onClick={this.triggerAuthorChange.bind(this)}>Change author</span>
                    { this.state.post.url ? (<span class="clickable" onClick={this.triggerSlugChange.bind(this)}>Change URL</span>) : null }
                    <span class="red clickable" onClick={this.triggerPreviewLinkInvalidation.bind(this)}>Invalidate preview link</span>
                </footer>

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
            destroy : this.destroy.bind(this),
            validate : this.validate.bind(this),
            commitchanges : this.commitchanges.bind(this),
            unpublish : this.unpublish.bind(this),
            refuse : this.refuse.bind(this)
        };

        this.coldState = {};
        this.edits = {};
        this.modalStage = {};

        this.socketArticleUpdateEvent_bound = this.socketArticleUpdateEvent.bind(this);
    }

    componentDidMount() {
        this.requestArticle(this.props.postid);
        bindRealtimeEvent('articleUpdate', this.socketArticleUpdateEvent_bound);
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

    validate(done) {
        this.save(() => {
            API.put('/publishing/validate/' + this.coldState.post._id, {}, (err, json, r) => {
                if (r.status == 200) {
                    castOverlay('publish-article', {
                        publishFunction : this.publish.bind(this),
                        getReportFunction : this.getReport.bind(this)
                    });
                } else {
                    castNotification({
                        type : "warning",
                        title : "Could not publish article",
                        message : r.responseText
                    });
                }
    
                done();
            });            
        });
    }

    getReport(sendback) {
        API.get('/publishing/report/' + this.coldState.post._id, {}, (err, json, r) => {
            sendback(err, json);
        });
    }

    publish(done) {
        API.put('/publishing/publish/' + this.coldState.post._id, {}, (err, json, r) => {
            if (r.status == 200) {
                hit();
                this.setState({
                    history : [json.historyentry, ...this.state.history],
                    post : {...this.state.post, ...{
                        status : json.newstate.status,
                        date : json.newstate.date,
                        name : json.newstate.name,
                        publishedAt : Date.now()
                    }}
                }, () => {
                    this.coldState.post = this.state.post; 

                    done(r.status);    
                });
            } else {
                r.text().then(message => {
                    castNotification({
                        type : "warning",
                        title : "Could not publish article",
                        message
                    });

                    done(r.status, message);
                })
            }
        });
    }

    unpublish(done) {
        API.delete('/publishing/unpublish/' + this.coldState.post._id, {}, (err, json, r) => {
            if (r.status == 200) {
                this.setState({
                    history : [json.historyentry, ...this.state.history],
                    post : {...this.state.post, ...{
                        status : json.newstate.status,
                        date : json.newstate.date,
                        name : json.newstate.name,
                        publishedAt : Date.now()
                    }}
                }, () => {
                    this.coldState.post = this.state.post; 
                });
            } else {
                r.text().then(message => {
                    castNotification({
                        type : "warning",
                        title : "Could not unpublish article",
                        message
                    });
                })
            }

            done();
        });
    }

    preview(done) {
        this.save(() => {
            const loc = document.location.protocol + liliumcms.url + "/publishing/preview/" + this.props.postid + "/" + (this.state.post.previewkey || "");
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

            done();
        });        
    }

    submitForApproval(done) {
        this.save(() => {
            API.put('/publishing/validate/' + this.coldState.post._id, {}, (err, json, r) => {
                if (r.status == 200) {  
                    API.put('/publishing/submit/' + this.coldState.post._id, {}, (err, json, r) => {
                        if (json && !json.error) {
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
                                message : json.error
                            });
                        }

                        done();
                    });
                } else {
                    r.text().then(message => {
                        castNotification({
                            type : "warning",
                            title : "Could not send article for approval",
                            message
                        });
                    })
                    done();
                }

            });
        })
    }

    refuse() {
        API.put('/publishing/refuse/' + this.coldState.post._id, {}, (err, json, r) => {
            if (json && !json.error) {
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
                    message : json.error
                });
            }

            done();
        });
    }

    destroy() {
        API.delete('/publishing/destroy/' + this.coldState.post._id, {}, (err, json, r) => {
            if (json && !json.error) {
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
                    message : json.error
                });
            }

            done();
        });
    }

    commitchanges(done) {
        this.save(() => {
            API.put('/publishing/refresh/' + this.coldState.post._id, {}, (err, json, r) => {
                if (json && json.ok) {
                    castNotification({
                        type : "success",
                        title : "Article refreshed",
                        message : "The article was successfully updated, and the changes should appear on the website."
                    });
                } else {
                    castNotification({
                        type : "error",
                        title : "Could not commit changes",
                        message : "Error " + r.status
                    });
                }

                done();
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
            this.setState(post ? { post, loading: false, history : resp[endpoints.history.endpoint] } : { error : "Article not Found", loading : false }, () => {
                done && done();
            });
        });
    }


    fieldChanged(name, value) {
        this.edits[name] = value;
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
    }

    imageChanged(name, image) {
        if (image) {
            this.edits.media = image._id;
            this.edits.facebookmedia = image.sizes.facebook.url;
        }
    }

    topicChanged(name, topic) {
        if (topic) {
            this.edits.topic = topic._id;
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
                delete this.edits.content;
                this.setState({ post });
            }
        });
    }

    handleDetailsAction(field, value) {
        if (field == "name") {
            API.put("/publishing/slug/" + this.state.post._id, { slug : value }, (err, json, r) => {
                if (json.err) {
                    castNotification({
                        type : "warning",
                        title : "Could not edit URL slug",
                        message : json.err
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
        } else if (field == "previewkey") {
            API.delete('/publishing/previewlink/' + this.state.post._id, {}, (err, json, r) => {
                if (r.status == 200) {
                    const post = this.state.post;
                    post.previewkey = json.previewkey;

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
            });
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
                <div class="publishing-edit-section">
                    <TextField onChange={this.fieldChanged.bind(this)} format={x => [x]} name="title" initialValue={this.state.post.title[0]} placeholder="Publication headline" placeholderType="inside" wrapstyle={{ marginBottom: 6 }} style={{ fontFamily : '"Oswald", sans-serif', background : "transparent", fontSize : 32, border : "none", borderBottom : "1px solid #DDD", padding : "3px 0px", textAlign : 'center' }} />
                    <TextField onChange={this.fieldChanged.bind(this)} format={x => [x]} name="subtitle" initialValue={this.state.post.subtitle[0]} placeholder="Subtitle or catchline" placeholderType="inside" style={{ background : "transparent", border : "none", padding : "5px 0px", marginBottom : 10, textAlign : 'center' }} />
                    
                    <div style={{ margin: "auto", maxWidth: 1200 }}>
                        <TextEditor onChange={this.contentChanged.bind(this)} name="content" content={this.state.post.content[0]} />
                    </div>

                    <div class="publishing-card nopad">
                        <TopicPicker onChange={this.topicChanged.bind(this)} name="topic" initialValue={this.state.post.topic || undefined} placeholder="Select a topic" />
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

                    <div class="card publishing-card">
                        <MediaPickerField name="media" placeholder="Featured image" initialValue={this.state.post.media} onChange={this.imageChanged.bind(this)} />
                    </div>

                    <div class="card publishing-card nopad">
                        <PostDetails post={this.state.post} onAction={this.handleDetailsAction.bind(this)} />
                    </div>
                </div>

                <div class="publishing-sidebar">
                    <PublishingSidebar post={this.state.post} actions={this.actions} history={this.state.history} historyEntryClicked={this.historyEntryClicked.bind(this)} />
                </div>
            </div>
        )
    }
}
