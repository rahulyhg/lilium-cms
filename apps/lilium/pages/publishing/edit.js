import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import { setPageCommands } from '../../layout/lys';
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

    createTinyMCEInstance() {
        log('Publishing', 'Creating a new TinyMCE instance', 'detail');

        tinymce.init({
            selector : "#content-editor",
            height: 500,
            convert_urls : false,
            menubar: false,
            plugins: [
                'advlist autolink lists link image charmap print preview anchor textcolor',
                'searchreplace visualblocks code fullscreen hr',
                'media paste wordcount'
            ],
            toolbar: 'bold italic underline strike strikethrough forecolor | removeformat | undo redo | formatselect | hr insertAd insertUpload insertEmbed link | bullist numlist | fullscreen | code',
            content_css: [
                '/compiled/theme/tinymce.css'
            ],
        }).then(editors => {
            if (editors && editors[0]) {
                log('Publishing', 'Injecting content into TinyMCE instance', 'detail');
                editors[0].setContent(this.state.post.content[0]);
            }
        })
    }

    save() {
        log('Publishing', 'Saving current post with id ' + this.props.postid, 'detail');
    }

    requestArticle(postid) {
        this.setState({ loading : true });
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
            
            this.setState(post ? { post, loading: false } : { error : "Article not Found", loading : false }, () => {
                post && this.createTinyMCEInstance();
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
                <h1>{this.state.post.title}</h1>
                <h2>{this.state.post.subtitle}</h2>
                <textarea id="content-editor"></textarea>
            </div>
        )
    }
}