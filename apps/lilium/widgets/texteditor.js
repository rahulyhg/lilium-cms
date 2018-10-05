import { h, Component } from 'preact';
import API from '../data/api';
import { Picker } from '../layout/picker';

export class TextEditor extends Component {
    constructor(props) {
        super(props);
        this.oldValue = '';
        this.state = {

        }
        this.textarea;

        this.autosave = props.autosave;

        if (this.autosave) {
            this.endpoint = props.endpoint;
            this.fieldkey = props.fieldkey || "field";
            this.valuekey = props.valuekey || "value";
            this.savemethod = props.savemethod || "post";
        }

        this.rID = "txt-" + Math.random().toString().substring(2) + Date.now().toString()
    }

    createEditor() {                
        log('TextEditor', 'Creating a new TinyMCE instance with ID ' + this.rID, 'detail');

        this.textarea ? tinymce.init({
            target : this.textarea,
            height: 500,
            convert_urls : false,
            menubar: false,
            setup: editor => {
                editor.addButton('insert-place', {
                    icon: 'fa fa-plus-circle',
                    tooltip: 'Insert Place',
                    onclick: () => {
                        const session =  new Picker.Session({});
                        Picker.cast(session, place => {
                            const dummyPlaceEl = document.createElement('div');
                            dummyPlaceEl.className = 'lml-placeholder-google-maps';
                            dummyPlaceEl.dataset.placeId = place._id;

                            editor.insertContent(dummyPlaceEl.outerHTML);
                        });
                    }
                });
            },
            plugins: [
                'advlist autolink lists link image charmap print preview anchor textcolor',
                'searchreplace visualblocks code fullscreen hr',
                'media paste wordcount'
            ],
            toolbar: 'bold italic underline strike strikethrough forecolor | removeformat | undo redo | formatselect | hr insertAd insert-image insert-place insertEmbed link | bullist numlist | fullscreen | code',
            content_css: [
                '/compiled/theme/tinymce.css'
            ],
        }).then(editors => {
            if (editors && editors[0]) {
                this.texteditor = editors && editors[0];
                this.texteditor.on('blur', this.handleBlur.bind(this));
                this.texteditor.show();
                this.texteditor.setContent(this.props.content);
                this.texteditor.undoManager.clear();
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
            this.oldValue = props.content;
        }
    }

    shouldComponentUpdate() {
        return false;
    }

    handleBlur() {
        if (this.oldValue != this.getContent()) {
            this.props.onChange && this.props.onChange(this.props.name || this.rID, this.props.format ? this.props.format(this.getContent()) : this.getContent());
            this.oldValue = this.getContent();
        }

        if (this.autosave) {
            this.setState({ saving : true });
            API[this.savemethod](this.endpoint, {
                [this.fieldkey] : this.props.name || this.rID, 
                [this.valuekey] : this.props.format ? this.props.format(this.getContent()) : this.getContent()
            }, (err, resp, r) => {
                if (err || r.status / 200 != 1) {
                    this.setState({ saving : false });
                } else {
                    this.setState({ saving : false, saveerror : true });
                }
            })
        }
    }

    getContent() {
        return this.texteditor && this.texteditor.getContent();
    }

    render() {
        log('TextEditor', 'Rendering text editor with random ID ' + this.rID, 'detail');
        
        return (
            <div style={this.props.style || { display: "block" }}>
                <textarea ref={el => (this.textarea = el)} id={this.rID}>{this.props.content}</textarea>
            </div>
        )
    }
}