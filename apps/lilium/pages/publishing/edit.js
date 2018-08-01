import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import { setPageCommands } from '../../layout/lys';
import { TextEditor } from '../../widgets/texteditor';
import { TextField } from '../../widgets/form';
import API from "../../data/api";

export default class EditView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading : true
        };
    }

    componentDidMount() {
        this.requestArticle(this.props.postid);
    }

    save() {
        log('Publishing', 'Saving current post with id ' + this.props.postid, 'detail');
    }

    requestArticle(postid) {
        this.setState({ loading : true });
        setPageCommands([ {
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
            
            this.setState(post ? { post, loading: false } : { error : "Article not Found", loading : false }, () => {
                
            });
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

        if (this.state.loading) {
            return (
                <div>Loading...</div>
            )
        }

        return (
            <div>
                <h1>Publishing</h1>

                <div style={{ padding : 10 }}>
                    <TextField initialValue={this.state.post.title[0]} placeholder="Title" placeholderType="inside" wrapstyle={{ marginBottom: 10 }} style={{ fontFamily : '"Oswald", sans-serif', fontSize : 32 }} />
                    <TextField initialValue={this.state.post.subtitle[0]} placeholder="Subtitle" placeholderType="inside" />
                    <TextEditor content={this.state.post.content[0]}></TextEditor>
                </div>
            </div>
        )
    }
}