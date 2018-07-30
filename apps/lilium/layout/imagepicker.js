import { h, Component } from 'preact';
import { TextField, ButtonWorker } from '../widgets/form';
import API from '../data/api';

const styles = {
    bigtitle : {
        fontSize: 28,
        padding: "8px 0px 1px",
        display: "block",
        margin: "10px 20px",
        borderBottom: "1px solid #CCC"
    },
    noimagetitle : {
        display: "block",
        textAlign: "center",
        marginTop: 100,
        fontSize: 32,
        color: "#CCC"
    },
    noimageicon : {
        display : "block",
        textAlign : "center",
        fontSize : 72,
        marginTop : 30,
        color : "#CCC"
    },
    selectedFields : {
        padding : "5px 15px",
        wordBreak: "break-all"
    },
    textboxes : {
        padding : 8,
        fontSize : 15,
        backgroundColor : "white"
    }
}

class SelectedImage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected : props.image
        }
    }

    componentWillReceiveProps(props) {
        log('ImagePicker', 'Selected image received image as prop, about to set state', 'detail');
        this.imgtag && this.imgtag.getAttribute('src') != this.makeSrc(props.image) && this.imgtag.removeAttribute('src');
        this.setState({
            selected : props.image
        })
    }

    makeSrc(image) {
        return image.sizes.content.url;
    }

    render() {
        if (!this.state.selected) {
            return (
                <div>
                    <b style={ styles.noimagetitle }>No image selected</b>
                    <i style={ styles.noimageicon } class="fal fa-image"></i>
                </div>
            )
        }

        return (
            <div>
                <img ref={img => this.imgtag = img} src={this.makeSrc(this.state.selected)} class="image-picker-selected-full" />
                <div style={styles.selectedFields}>
                    <TextField style={styles.textboxes} name="uploadArtistName" initialValue={this.state.selected.artistname} placeholder="Artist name" />
                    <TextField style={styles.textboxes} name="uploadArtistURL" initialValue={this.state.selected.artisturl} placeholder="Source URL" />
                    <div>
                        <b>Full URL : </b>
                        <a href={document.location.protocol + liliumcms.url + "/" + this.state.selected.fullurl} target="_blank">
                            {document.location.protocol}{liliumcms.url}/{this.state.selected.fullurl}
                        </a>
                    </div>
                    <div style={{ padding: 20, textAlign: 'center' }}>
                        <ButtonWorker theme="" text="Select image" work={done => this.props.selectFromWorker()} sync={true} />
                    </div>
                </div>
            </div>

        )
    }
}

class ImageThumbnail extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected : props.selected
        };
    }

    componentWillReceiveProps(props) {
        this.setState({ selected : props.selected })
    }

    clicked(ev) {
        this.props.clicked(this.props.image, this);
    }

    render() {
        return (
            <img onClick={this.clicked.bind(this)} 
                class={"image-picker-thumb " + (this.state.selected ? "selected" : "")} 
                src={this.props.image.sizes.thumbnail.url} 
            />
        )
    }
}

let _singleton;
export class ImagePicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            visible : false,
            params : {},
            images : [],
            selected : undefined
        };

        _singleton = this;
        this.keydown_bound = this.keydown.bind(this);
    }

    static cast(params, done) {
        log('ImagePicker', 'Casting image picker singleton', 'detail');
        const initState = { params, visible : true, selected : undefined, callback : done };
        if (params && params.selected) {
            initState.loading = true;
            _singleton.setState(initState);

            _single.fetchLatest(allImages => {
                API.get("/uploads/single/" + params.selected, {}, (err, upload) => {
                    allImages.unshift(upload);
                    initState.images = allImages;
                    initState.selected = upload;

                    _singleton.setState(initState);
                });
            });
        } else {
            _singleton.setState(initState);
        }          
        
        window.addEventListener('keydown', _singleton.keydown_bound);
    }

    static dismiss() {
        log('ImagePicker', 'Dismissing image picker singlethon', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);
    }

    static accept() {        
        if (_singleton.state.selected) {
            _singleton.state.callback && _singleton.state.callback(_singleton.state.selected);        
            ImagePicker.dismiss();
        }
    }

    castUpload() {
        this.fileElem.click();
    }

    prepareUpload(ev) {
        const files = ev.target.files;
        if (files && files.length > 0) {
            Array.from(files).forEach(file => {
                const freader = new FileReader();
                freader.onload = () => {
                    const data = freader.result;
                    API.upload(data, file.name, (err, resp) => {
                        console.log(resp);
                    });
                };

                freader.readAsArrayBuffer(file);
            })
        } else {
            // NoOP
        }
    }

    keydown(ev) {
        ev.keyCode == "27" && ImagePicker.dismiss();
        ev.keyCode == "13" && ImagePicker.accept();
    }

    fetchLatest(sendback) {
        API.get('/uploads', { limit : 100, skip : 0 }, (err, uploads) => {
            sendback ? sendback(uploads) : this.setState({ images : uploads });
        })
    }

    componentDidMount() {
        this.fetchLatest();
    }

    imageClicked(selected, comp) {
        log('ImagePicker', 'Image click event was caught by image picker', 'detail');
        this.setState({
            selected
        });
    }

    render() {
        if (!this.state.visible) return null;

        return (
            <div id="image-picker-overlay">
                <div id="image-picker">
                    <div>
                        <b style={ styles.bigtitle }>Lilium gallery</b>
                        <input type="file" ref={el => (this.fileElem = el)} onChange={this.prepareUpload.bind(this)} style={{opacity : 0}} />
                    </div>

                    <div id="image-gallery">
                        <div id="image-upload-button" onClick={this.castUpload.bind(this)}><i class="far fa-plus-circle"></i></div>
                        {
                            this.state.images.map(x => (<ImageThumbnail image={x} selected={this.state.selected && this.state.selected == x} clicked={this.imageClicked.bind(this)} />))
                        }
                    </div>

                    <div id="image-gallery-detail"> 
                        <SelectedImage image={this.state.selected} selectFromWorker={ImagePicker.accept.bind(ImagePicker)} />       
                    </div>
                </div>
            </div>
        )
    }
}