import { h, Component } from 'preact';
import API from '../../data/api';
import { BigList } from '../../widgets/biglist';

export default class CommentsManager extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        return (
            <div class="comments-manager">
                <BigList endpoint="/comments/latest" />
                <BigList endpoint="/comments/posts" />
            </div>
        )
    }
}