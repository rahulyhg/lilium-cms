import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import { setPageCommands } from '../../layout/lys';
import API from "../../data/api";

export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    componentDidMount() {
        this.requestArticle(this.props.postid);
    }

    save() {
        log('Publishing', 'Saving current post with id ' + this.props.postid, 'detail');
    }

    requestArticle(postid) {
        setPageCommands([{
            command : "save",
            displayname : "Save Article",
            execute : this.save.bind(this)
        }]);

        const endpoints = {
            post : { endpoint : "/publishing/write/" + postid, params : {} }
        };

        API.getMany(Object.keys(endpoints).map(key => endpoints[key]), resp => {
            const post = resp[endpoints.post.endpoint];
            post ?
                log('Publishing', 'About to display : ' + post.headline, 'detail') :
                log('Publishing', 'Article not found : ' + postid, 'warn');
            
            this.setState(post ? { post } : { error : "Article not Found" });
        });
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