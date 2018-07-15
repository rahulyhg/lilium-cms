import { h, Component } from 'preact';

export class TextEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }

        this.rID = "txt-" + Math.random().toString().substring(2) + Date.now().toString()
    }

    createEditor() {                
        log('TextEditor', 'Creating a new TinyMCE instance with ID ' + this.rID, 'detail');

        tinymce.init({
            selector : "#" + this.rID,
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
                this.texteditor = editors[0];
                log('TextEditor', 'Injecting content into TinyMCE instance', 'detail');
                editors[0].setContent(this.props.content || "<p></p>");
            }
        })
    }

    componentDidMount() {
        this.createEditor();
    }

    componentWillUnmount() {
        log('TextEditor', 'Destroying a TinyMCE instance', 'detail');
        this.texteditor && this.texteditor.destroy();
    }

    componentWillReceiveProps(props) {
        if (props.content && this.texteditor) {
            this.texteditor.setContent(props.content);
        }
    }

    getContent() {
        return this.texteditor && this.texteditor.getContent();
    }

    render() {
        return (
            <textarea id={this.rID}>
                
            </textarea>
        )
    }
}