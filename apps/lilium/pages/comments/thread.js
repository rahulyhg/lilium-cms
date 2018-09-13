import { h, Component } from "preact";
import { ButtonWorker } from '../../widgets/form';
import { Link, navigateTo } from '../../routing/link';
import API from '../../data/api';
import dateformat from 'dateformat';
import { castNotification } from '../../layout/notifications'; 

const styles = {
    articleheadline : {
        fontSize : 20,
        padding : 10
    },
    originaldate : {
        textAlign: 'right',
        color : '#999',
        fontSize : 14
    }
}

class ThreadHeader extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }
    }

    render() {
        return (
            <div class="thread-view-col">
                <div class="card">
                    <Link href={"/publishing/write/" + this.props.thread.articleid} linkStyle="block">
                        <div class="image-wrapper">
                            <img src={this.props.thread.featuredimage} />
                        </div>
                            
                        <div style={styles.articleheadline}>
                            {this.props.thread.headline}
                        </div>
                    </Link>
                </div>

                <div class="card">
                    <div class="detail-head">
                        <img class="avatar" src={this.props.thread.commenter.picture} />   
                        <b class="avatar-name">{this.props.thread.commenter.displayname}</b> 
                    </div>
                    
                    <p>{this.props.thread.text}</p>

                    <footer>
                        {dateformat(this.props.thread.date, 'mmmm dd, yyyy - HH:MM:ss')}
                    </footer>
                </div>
                
                <div style={{ marginTop : 15 }} class="thread-view-actions">
                    <ButtonWorker work={this.props.deleteAction.bind(this)} text="Delete thread" theme="danger" />
                    <ButtonWorker text="Ban User [TO DO]" theme="white" />
                </div>
            </div>
        );
    }
}

class SingleReply extends Component {
    constructor(props) {
        super(props);
        this.state = {
            reply : props.reply,
            commenter : props.commenter
        };
    }

    deleteThis() {
        API.delete("/comments/reply/" + this.state.reply._id, {}, () => {
            castNotification({
                type : "success",
                title : "Reply deleted",
                message : "The reply has been successfully marked as deleted."
            });

            const reply = this.state.reply;
            reply.active = false;
            reply.deletedText = reply.text;
            this.setState({ reply });
        });
    }

    render() {
        return (
            <div class="card" style={{ opacity : this.state.reply.active ? 1 : 0.5 }}>
                <div class="detail-head"><b>{this.state.commenter.displayname}</b></div>

                <p class="small">{this.state.reply.active ? this.state.reply.text : this.state.reply.deletedText}</p>
                <footer>
                    <span>{dateformat(this.state.reply.date, 'mmmm dd, yyyy - HH:MM:ss')}</span>
                    {
                        this.state.reply.active ? (<span>
                            <b onClick={this.deleteThis.bind(this)} class="delete-color clickable">Delete Reply</b>
                        </span>) : null
                    }
                </footer>
            </div>
        )
    }
}

class RepliesList extends Component {
    render() {
        return(
            <div class="thread-view-col">
                <div>
                {
                    this.props.thread.replies.map((reply, i) => (<SingleReply reply={reply} commenter={this.props.thread.commenters[i]} />))
                }
                </div>
            </div>
        )
    }
}

export default class ThreadView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            thread : undefined, 
            replies : []
        };
    }

    componentDidMount() {
        API.get("/comments/thread/" + this.props.threadid, {}, (err, thread) => {
            if (err) {

            } else {
                this.setState({
                    thread
                });
            }
        });
    }

    deleteThread(_id) {
        API.delete("/comments/thread/" + this.props.threadid, {}, () => {
            castNotification({
                type : "success",
                title : "Thread deleted",
                message : "The thread has been successfully marked as deleted."
            });

            navigateTo("/comments");
        });
    }

    render() {
        return this.state.thread ? (
            <div style={{ maxWidth : 900, margin : "10px auto" }}>
                <h1>Comment Thread</h1>
                <div class="thread-view">
                    <ThreadHeader thread={this.state.thread} deleteAction={this.deleteThread.bind(this)} />
                    <RepliesList thread={this.state.thread} />
                </div>
            </div>
        ) : (
            <div>Loading...</div>   
        );
    }
}