import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import API from "../../data/api";



export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    componentDidMount() {
        const endpoints = {
            post : { endpoint : "/publishing/write/" + this.props.postid, params : {} }
        };

        API.getMany(Object.keys(endpoints).map(key => endpoints[key]), resp => {
            const post = resp[endpoints.post.endpoint];
            post ?
                log('Publishing', 'Loaded : ' + post.headline, 'detail') :
                log('Publishing', 'Article not found : ' + this.props.postid, 'warn');
            
            this.setState(post ? { post } : { error : "Article not Found" });
        });
    }

    render() {
        if (this.state.error) {
            return (
                <div>
                    {this.state.error}
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