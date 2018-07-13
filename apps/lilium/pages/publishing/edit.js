import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import API from "../../data/api";

export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    componentDidMount() {
        API.get("/publishing/write/" + this.props.postid, {}, (err, post) => {
            if (!post) {
                log('Publishing', 'Article not found : ' + this.props.postid, 'warn');
            } else {
                log('Publishing', 'Loaded : ' + post.headline, 'detail');
            }

            this.setState(post ? { post } : { error : "Article not Found" })
        });
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    Article not found
                </div>
            )
        }

        return !this.state.post ? (
            <div>
                Loading...
            </div>
        ) : (
            <div>
                <h1>{this.state.post.title}</h1>
                <h2>{this.state.post.subtitle}</h2>
            </div>
        )
    }
}