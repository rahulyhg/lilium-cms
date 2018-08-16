import { h, Component } from 'preact';
import API from '../../data/api';
import { BigList } from '../../widgets/biglist';
import dateformat from 'dateformat';

class CommentEntry extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }
    
    render() {
        return (
            <div>
                
                <p>{this.props.item.text}</p>
                <div>{dateformat(this.props.item.date, 'MMMM DD, YYYY - hh:mm:ss')}</div>
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

    render() {
        return (
            <div class="comments-manager">
                <BigList endpoint="/comments/latest" listitem={CommentEntry} />
            </div>
        )
    }
}