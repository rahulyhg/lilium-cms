import { h, Component } from 'preact';
import API from '../data/api';
import { Picker } from '../layout/picker';
import { ImagePicker } from '../layout/imagepicker';
import { PlacePicker } from '../layout/placepicker';
import { EmbedPicker } from '../layout/embedpicker';
import { createDeflate } from 'zlib';

function embedToPreviewElement(embed, isCarousel) {
    let contentNode = document.createElement('div');
    contentNode.className = (isCarousel ? "embed-carousel-preview " : "embed-preview ") + embed.embed.type;

    switch (embed.embed.type) {
        case "instagram":
            let img = document.createElement('img');

        case "igvideo":
        case "igcarousel":
            let igcimg = document.createElement('img');
            igcimg.className = "lml-embed-carousel-v4-preview";
            igcimg.src = embed.embed.urlpath;
            contentNode.appendChild(igcimg);
            break;

        case "vimeo":
            let vimg = document.createElement('img');
            vimg.className = "lml-embed-carousel-v4-preview";
            vimg.src = embed.embed.thumbnailplay;
            contentNode.appendChild(vimg);
            break;

        default:
            contentNode.innerHTML = embed.embed.html;
            let iframe = contentNode.querySelector('iframe');
            if (iframe) {
                if (isCarousel) {
                    iframe.width = 240;
                    iframe.height = 240;
                } else {
                    iframe.width = 640;
                    iframe.height = 320;
                }
            }
    }

    return contentNode;
}

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

        this.rID = "txt-" + Math.random().toString().substring(2) + Date.now().toString();
        this.bookmark;
    }

    /**
     * Parses an embed object and returns markup to be inserted in the article body.
     * This markup is to be used by the theme as an article is displayed by a client
     * @param {object} embed The embed object to serialize as markup
     */
    static embedToMarkup(embed, isCarousel) {
        embed.type = embed.type || embed.embedType;

        const node = document.createElement('div');
        node.className = 'lml-placeholder ' + embed.type;
        node.setAttribute('contenteditable', false);
        node.textContent = "";

        node.dataset.id = embed[embed.type]._id;
        node.dataset.type = embed.type;
        if (embed.type == ImagePicker.slug) {
            let imagepreview = document.createElement('img');
            imagepreview.src = embed[ImagePicker.slug].sizes.facebook.url;
            imagepreview.className = "lml-content-image lml-upload-v4";
            imagepreview.dataset.width = embed[ImagePicker.slug].size.width;
            imagepreview.dataset.height = embed[ImagePicker.slug].size.height;

            node.dataset.thumbnail = embed[ImagePicker.slug].sizes.square.url;
            node.appendChild(imagepreview);
        } else if (embed.type == PlacePicker.slug) {
            let mappreview = document.createElement('div');
            mappreview.className = "lml-content-map lml-place-v4";

            let spanname = document.createElement('div');
            spanname.textContent = embed[PlacePicker.slug].displayname;
            spanname.dataset.placename = embed[PlacePicker.slug].displayname;
            spanname.className = "lml-place-v4-name";
            mappreview.appendChild(spanname);

            let fancymap = document.createElement('img');
            fancymap.src = "/static/svg/continents.svg";
            fancymap.className = "lml-place-v4-fancymap";
            mappreview.appendChild(fancymap);

            node.dataset.placename = embed[PlacePicker.slug].displayname;
            node.appendChild(mappreview);
        } else if (embed.type == EmbedPicker.slug) {
            node.dataset.embedtype = embed[EmbedPicker.slug].type;
            node.dataset.embedjson = JSON.stringify(embed[EmbedPicker.slug]);

            let elContent = embedToPreviewElement(embed, isCarousel);
            node.appendChild(elContent);
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
                        this.bookmark = editor.selection.getBookmark(2, true);
                        const session =  new Picker.Session({});
                        const selectedEl = editor.selection.getNode();
                        
                        if (selectedEl && selectedEl.classList.contains('lml-placeholder')) {
                            session.replaceOld = true;
                            if (selectedEl.dataset.type == ImagePicker.slug) {
                                session.options[ImagePicker.slug] = { selected: selectedEl.dataset.id };
                            }
                        }

                        Picker.cast(session, embed => {
                            log('TextEditor', "Picker callback received embed: ", embed, 'info');
                            this.bookmark && editor.selection.moveToBookmark(this.bookmark);
                            this.bookmark = undefined;
                            editor.insertContent(TextEditor.embedToMarkup(embed).outerHTML);
                        });
                    }
                });

                editor.addButton('insert-carousel', {
                    icon: 'fa fa-images',
                    tooltip: 'Insert Carousel',
                    onclick: () => {
                        const oldNode = editor.selection.getNode();

                        this.bookmark = editor.selection.getBookmark(2, true);

                        const selectedItems = Array.from(
                            editor.selection.getNode().querySelectorAll(".lml-placeholder")
                        ).map(x => {
                            return { 
                                type : x.dataset.type, 
                                [ImagePicker.slug] : { _id : x.dataset.id, sizes : { square : { url : x.dataset.thumbnail }, facebook : { url : x.dataset.thumbnail } }, size : { width : x.dataset.width, height : x.dataset.height } },
                                [PlacePicker.slug] : { _id : x.dataset.id, displayname : x.dataset.placename },
                                [EmbedPicker.slug] : { _id : x.dataset.id, type : x.dataset.embedtype, ...JSON.parse(x.dataset.embedjson || '{}') }
                        }});

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
                                    const embed = TextEditor.embedToMarkup(element, true);
                                    carouselElement.appendChild(embed);
                                });
                            }

                            this.bookmark && editor.selection.moveToBookmark(this.bookmark);
                            this.bookmark = undefined;

                            carouselPlaceholder.setAttribute('contenteditable', false);
                            carouselPlaceholder.appendChild(carouselElement);
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
