import { h, Component } from 'preact';
import { TextField, ButtonWorker } from '../widgets/form';
import API from '../data/api';
import { Picker } from './picker';

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
            selected : props.selected,
            uploading : !!props.file,
            progress : 0,
            image : props.image
        };
    }

    componentDidMount() {
        if (this.props.file) {
            log('ImagePicker', 'Starting POST XHR', 'detail');
            this.upload();
        }
    }

    upload() {
        API.upload(this.props.file, this.props.file.name, oEvent => {
            const ratio = oEvent.loaded / oEvent.total * 100;
            ratio != 100 ? this.setState({ progress : ratio }) : this.setState({ loading : true, progress : ratio, uploading : false });
        }, (err, image) => {
            if (!err) {
                this.setState({ uploading : false, loading : false, progress : 100, image }, () => {
                    this.clicked();
                });
            } else {
                log('ImagePicker', 'Upload failed : ' + err, 'err');
                this.setState({ uploading : false, loading : false, error : err });
            }
        });
    }

    componentWillReceiveProps(props) {
        this.setState({ selected : props.selected });
    }

    clicked() {
        this.props.clicked(this.state.image, this);
    }

    render() {
        if (this.state.uploading) {
            return (
                <div class={"image-picker-thumb"}>
                    <div class="image-picker-progress-width" style={{ width : this.state.progress + "%" }}></div>
                </div>
            );
        }

        if (this.state.loading) {
            log('ImagePicker', 'Waiting for response from upload endpoint', 'detail');
            return (
                <div class="image-picker-thumb image-upload-loading">
                    <i class="far fa-spinner-third fa-spin"></i>
                </div>
            );
        }

        return (
            <img onClick={this.clicked.bind(this)} 
                class={"image-picker-thumb " + (this.state.selected ? "selected" : "")} 
                src={this.state.image.sizes.thumbnail.url} 
            />
        )
    }
}

export class ImagePicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            images : [],
            selected : undefined
        };
    }

    static tabTitle =  'Uploads';

    componentDidMount(params, done) {
        log('ImagePicker', 'Displaying image picker singleton', 'detail');
        const initState = { params, visible : true, selected : undefined, callback : done };
        if (params && params.selected) {
            initState.loading = true;
            this.setState(initState);

            this.fetchLatest(allImages => {
                API.get("/uploads/single/" + params.selected, {}, (err, upload) => {
                    allImages.unshift(upload);
                    initState.images = allImages;
                    initState.selected = upload;

                    this.setState(initState);
                });
            });
        } else {
            this.setState(initState);
        }          
    }

    castUpload() {
        this.fileElem.click();
    }

    prepareUpload(ev) {
        const files = ev.target.files;
        if (files && files.length > 0) {
            log("ImagePicker", "Initiating upload sequence", "detail");

            const ffs = Array.from(files).map(f => { return { uploading : true, file : f }; });
            const images = this.state.images;
            images.unshift(...ffs);

            log('ImagePicker', 'Prepared ' + ffs.length + ' files for upload', 'detail');
            this.setState({ images });
        } else {
            // NoOP
        }
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
        return (
            <div id="image-picker">
                <div>
                    <b style={ styles.bigtitle }>Lilium gallery</b>
                    <input type="file" ref={el => (this.fileElem = el)} onChange={this.prepareUpload.bind(this)} style={{opacity : 0}} />
                </div>

                <div id="image-gallery">
                    <div id="image-upload-button" onClick={this.castUpload.bind(this)}>
                        <i class="far fa-plus-circle"></i>
                    </div>

                    {
                        this.state.images.map(x => (<ImageThumbnail key={x.file || x._id} file={x && x.file} image={x} selected={this.state.selected && this.state.selected == x} clicked={this.imageClicked.bind(this)} />))
                    }
                </div>

                <div id="image-gallery-detail"> 
                    <SelectedImage image={this.state.selected} selectFromWorker={Picker.accept.bind(Picker)} />       
                </div>
            </div>
        )
    }
}