import { h, Component } from 'preact';
import API from '../data/api';
import { Picker } from '../layout/picker';
import { ImagePicker } from '../layout/imagepicker';
import { PlacePicker } from '../layout/placepicker';
import { EmbedPicker } from '../layout/embedpicker';

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

    /**
     * Parses an embed object and returns markup to be inserted in the article body.
     * This markup is to be used bi the theme as an article is displayed by a client
     * @param {object} embed The embed object to serialize as markup
     */
    static embedToMarkup(embed) {
        const node = document.createElement('div');
        node.className = 'lml-placeholder ' + embed.type;
        node.innerText = "";

        node.dataset.id = embed[embed.type]._id;
        node.dataset.type = embed.type;
        if (embed.type == ImagePicker.slug) {
            node.dataset.thumbnail = embed[ImagePicker.slug].sizes.square.url;
        } else if (embed.type == PlacePicker.slug) {
            node.dataset.placename = embed[PlacePicker.slug].displayname;
        } else if (embed.type == EmbedPicker.slug) {
            node.dataset.embedtype = embed[EmbedPicker.slug].type;
        }

        return node;
    }

    createEditor() {
        log('TextEditor', 'Creating a new TinyMCE instance with ID ' + this.rID, 'detail');

        this.textarea ? tinymce.init({
            target : this.textarea,
            height: 500,
            convert_urls : false,
            menubar: false,
            setup: editor => {
                editor.addButton('insertAd', {
                    icon: 'fa fa-usd-square',
                    tooltip : 'Insert an ad banner', 
                    onclick: () => {
                        const div = document.createElement('div');
                        div.setAttribute('contenteditable', false);
                        div.className = "lml-adplaceholder";
                        editor.insertContent(div.outerHTML);
                    }
                });

                editor.addButton('insert-element', {
                    icon: 'fa fa-image',
                    tooltip: 'Insert an image, a places or an embeds',
                    onclick: () => {
                        const session =  new Picker.Session({});
                        Picker.cast(session, embed => {
                            log('TextEditor', "Picker callback received embed: ", embed, 'info');
                            editor.insertContent(TextEditor.embedToMarkup(embed).outerHTML);
                        });
                    }
                });

                editor.addButton('insert-carousel', {
                    icon: 'fa fa-images',
                    tooltip: 'Insert Carousel',
                    onclick: () => {
                        const oldNode = editor.selection.getNode();

                        const selectedItems = Array.from(
                            editor.selection.getNode().querySelectorAll(".lml-placeholder")
                        ).map(x => ({ 
                            type : x.dataset.type, 
                            [ImagePicker.slug] : { _id : x.dataset.id, sizes : { square : { url : x.dataset.thumbnail } } },
                            [PlacePicker.slug] : { _id : x.dataset.id, displayname : x.displayname },
                            [EmbedPicker.slug] : { _id : x.dataset.id, type : x.dataset.embedtype }
                        }))

                        const session = new Picker.Session({ type: 'carousel' });

                        if (selectedItems.length != 0) {
                            session.carouselElements = selectedItems;
                            session.replaceOld = true;
                        }

                        Picker.cast(session, carousel => {
                            log('TextEditor', "Picker callback received carousel: ", carousel, 'info');
                            const carouselPlaceholder = document.createElement('div');
                            carouselPlaceholder.className = 'lml-carousel-placeholder';

                            const carouselElement = document.createElement('div');
                            carouselElement.className = 'carousel-element';

                            if (carousel.elements) {
                                carousel.elements.forEach(element => {
                                    const embed = TextEditor.embedToMarkup(element);
                                    carouselElement.appendChild(embed);
                                });
                            }
                            
                            carouselPlaceholder.setAttribute('contenteditable', false);
                            carouselPlaceholder.appendChild(carouselElement)
                            if (session.replaceOld) {
                                oldNode.parentElement.insertBefore(
                                    carouselPlaceholder, oldNode
                                );

                                oldNode.remove();
                                editor.insertContent(" ");
                            } else {
                                editor.insertContent(carouselPlaceholder.outerHTML);
                            }
                        });
                    }
                });
            },
            plugins: [
                'advlist autolink lists link image charmap print preview anchor textcolor',
                'searchreplace visualblocks code fullscreen hr',
                'media paste wordcount'
            ],
            toolbar: 'bold italic underline strike strikethrough forecolor | removeformat | undo redo | formatselect | insert-element insert-carousel insertEmbed link unlink insertAd hr | bullist numlist | fullscreen | code',
            content_css: [
                '/static/tinymcedefault.css',
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
