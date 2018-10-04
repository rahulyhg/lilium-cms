import { h, Component } from 'preact';
import API from '../../data/api';
import { Link } from '../../routing/link'
import { BigList } from '../../widgets/biglist';
import dateformat from 'dateformat';
import { castNotification } from '../../layout/notifications'; 

const styles = {
    fullbutton : {
        width: "calc(100% - 32px)",
        background: "white",
        textAlign: "center",
        padding: "30px 0",
        cursor: "pointer",
        boxSizing: "border-box",
        margin: "auto",
        color: "black",
        boxShadow: "0px 2px 1px 1px rgba(0, 0, 0, 0.1)",
        borderRadius: 3
    }
}

class CommentEntry extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    deleteComment() {
        this.setState({ deleting : true })
        this.props.action('delete', this.props.item);
    }

    banUser() {
        castNotification({
            type : "warning",
            title : "Feature not implemented",
            message : "This feature will be implemented in a different branch."
        })        
    }
    
    render() {
        return (
            <div class="card" style={{ opacity : this.state.deleting ? 0.5 : 1 }}>
                <div class="detail-head">
                    <div>
                        {
                            !this.props.item.active ? (
                                <span><b>Deleted</b> | </span>
                            ) : null
                        }
                        <span>{dateformat(this.props.item.date, 'mmmm dd, yyyy - HH:MM:ss')}</span>
                        <span> | </span>
                        <span>{this.props.item.replies} replies</span>
                        <span> | </span>
                        <span>{this.props.item.commenter.displayname}</span>
                    </div>
                    <div class="small"><Link href={"/publishing/write/" + this.props.item.articleid}>{this.props.item.headline}</Link></div>
                </div>                

                <p>{this.props.item.active ? this.props.item.text : this.props.item.deletedText}</p>

                <footer>
                    <Link href={"/comments/thread/" + this.props.item._id}>
                        View Thread
                    </Link>
                    <span class="clickable" onClick={this.banUser.bind(this)}>Ban User</span>
                    {                  
                        this.props.item.active && (<span class="red clickable"><b onClick={this.deleteComment.bind(this)}>Delete comment</b></span>)
                    }
                </footer>
            </div>
        )
    }
}

class CommentLoadMore extends Component {
    constructor(props) {
        super(props);
    }

    onClick() {
        this.props.onClick();
    }

    render() {
        return (
            <div style={styles.fullbutton} onClick={this.onClick.bind(this)}>
                <b>Load more comments</b>
            </div>
        )
    }
}
 

export default class CommentsManager extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "commentsListTb",
            title : "Filters",
            fields : [
                { type : "text", name : "search", title : "Search by word" },
                { type : "select", name : "status", title : "Status", options : [
                    { value : "active", text : "Visible on site" },
                    { value : "deleted", text : "Hidden from site" }
                ] }
            ]
        };
    }

    deleteOne(_id) {
        API.delete("/comments/thread/" + _id, {}, () => {
            this.biglist.loadMore(true);
            castNotification({
                type : "success",
                title : "Comment deleted",
                message : "The comment has been successfully marked as deleted."
            })
        });
    }

    gotMessageFromItem(type, extra) {
        switch (type) {
            case "delete": return this.deleteOne(extra._id);
            default: log('Comments', 'Received unknown task from list item : ' + type, 'warn');
        }
    }

    render() {
        return (
            <div class="comments-manager">
                <BigList ref={bl => (this.biglist = bl)} toolbar={CommentsManager.TOOLBAR_CONFIG} action={this.gotMessageFromItem.bind(this)} endpoint="/comments/latest" listitem={CommentEntry} loadmoreButton={CommentLoadMore} liststyle={{
                    maxWidth: 780,
                    margin: "10px auto",
                    padding: 0
                }} />
            </div>
        )
    }
}