import { h, Component } from 'preact';

export class TextEditor extends Component {
    constructor(props) {
        super(props);
        this.state = {

        }
        this.textarea;

        this.rID = "txt-" + Math.random().toString().substring(2) + Date.now().toString()
    }

    createEditor() {                
        log('TextEditor', 'Creating a new TinyMCE instance with ID ' + this.rID, 'detail');

        this.textarea ? tinymce.init({
            target : this.textarea,
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
                this.texteditor = editors && editors[0];
                this.texteditor.show();
                this.texteditor.setContent(this.props.content);
            } else { 
                log('TextEditor', 'No editor were created at that point', 'warn');
            }
        }) : log("TextEditor", "Could not create text editor due to missing element", "warn");
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
            log('TextEditor', 'Content set via new props', 'detail');
            this.texteditor.setContent(props.content);
        }
    }

    getContent() {
        return this.texteditor && this.texteditor.getContent();
    }

    render() {
        log('TextEditor', 'Rendering text editor with random ID ' + this.rID, 'detail');
        
        return (
            <div>
                <textarea ref={el => (this.textarea = el)} id={this.rID}>{this.props.content}</textarea>
            </div>
        )
    }
}