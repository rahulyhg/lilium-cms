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
            <div class="comments-man-listitem" style={{ opacity : this.state.deleting ? 0.5 : 1 }}>
                <div class="comments-man-post-details">
                    <span>{dateformat(this.props.item.date, 'mmmm dd, yyyy - HH:MM:ss')}</span>
                    <span> | </span>
                    <span>{this.props.item.replies} replies</span>
                    <span> | </span>
                    <span>{this.props.item.commenter.displayname}</span>
                </div>
                <div class="comments-man-post-headline"><Link href={"/publishing/write/" + this.props.item.articleid}>{this.props.item.headline}</Link></div>

                <p>{this.props.item.text}</p>

                <div class="comments-man-actions">
                    <Link href={"/comments/thread/" + this.props.item._id}>
                        View Thread
                    </Link>
                    <span class="clickable" onClick={this.banUser.bind(this)}>Ban User</span>                  
                    <span class="delete-color clickable"><b onClick={this.deleteComment.bind(this)}>Delete comment</b></span>
                </div>
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

    deleteOne(_id) {
        API.delete("/comments/" + _id, {}, () => {
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
                <BigList ref={bl => (this.biglist = bl)} action={this.gotMessageFromItem.bind(this)} endpoint="/comments/latest" listitem={CommentEntry} loadmoreButton={CommentLoadMore} />
            </div>
        )
    }
}