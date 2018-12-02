import { h, Component } from 'preact';
import { TextField, ButtonWorker } from '../widgets/form';
import API from '../data/api';
import { Picker } from './picker';
import { castNotification } from './notifications';

const styles = {
    bigtitle : {
        fontSize: 28,
        padding: "8px 0px 1px",
        display: "block",
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

        if (props.image) {
            props.image.embedType = 'image';
        }

        this.setState({
            selected: props.image
        })
    }

    makeSrc(image) {
        return image.sizes.content.url;
    }

    imageInfoChanged(name, val) {
        const newState = this.state;
        newState.selected[name]= val;
        API.post('/media/updatecredit', { id: newState.selected._id, name: newState.selected.artistname, url: newState.selected.artisturl }, (err, data, r) => {
            this.setState(newState);
            if (r.status == 200) {
                castNotification({
                    type: 'success',
                    title: 'Information updated'
                });
            } else {
                castNotification({
                    type: 'error',
                    title: 'Error updating information'
                })
            }
        });
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
                    <TextField style={styles.textboxes} name="artistname" initialValue={this.state.selected.artistname} placeholder="Artist name"
                                onChange={this.imageInfoChanged.bind(this)} />
                    <TextField style={styles.textboxes} name="artisturl" initialValue={this.state.selected.artisturl} placeholder="Source URL"
                                onChange={this.imageInfoChanged.bind(this)} />
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

    doubleclicked() {
        Picker.accept({ type: ImagePicker.slug, [ImagePicker.slug] : this.state.image });
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
            <img onClick={this.clicked.bind(this)} onDblClick={this.doubleclicked.bind(this)} 
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
            selectedid : props.options.selected
        };
    }

    static tabTitle =  'Uploads';
    static slug =  'upload';

    componentDidMount() {
        log('ImagePicker', 'Displaying image picker singleton', 'detail');
        const initState = { visible : true, selected : undefined };
        this.fetchLatest(allImages => {
            initState.images = allImages;

            if (this.state.selectedid) {
                API.get("/uploads/single/" + this.state.selectedid, {}, (err, upload) => {
                    allImages.unshift(upload);
                    initState.selected = upload;

                    this.setState(initState);
                });
            } else {
                this.setState(initState);
            }
        });
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
        }
    }

    fetchLatest(sendback) {
        API.get('/uploads', { limit : 100, skip : 0 }, (err, uploads) => {
            sendback ? sendback(uploads) : this.setState({ images : uploads });
        })
    }

    componentWillReceiveProps(props) {
        if (props.selected && props.selected.image) {
            this.imageSelected(props.selected.image);
        }
    }

    imageSelected(selected, comp) {
        log('ImagePicker', 'New image selected', 'detail');        
        this.setState({ selected });
    }

    render() {
        return (
            <div id="image-picker" onKeyDown={this.props.onKeyDown.bind(this)}>
                <div id="image-picker-flex-wrapper">
                    <div id="image-gallery">
                        <div id="image-upload-button" onClick={this.castUpload.bind(this)}>
                            <i class="far fa-plus-circle"></i>
                        </div>

                        {
                            this.state.images.map(x => (
                                <ImageThumbnail key={x.file || x._id} file={x && x.file} image={x} selected={this.state.selected && this.state.selected == x} clicked={this.imageSelected.bind(this)} />
                            ))
                        }

                        <input type="file" ref={el => (this.fileElem = el)} onChange={this.prepareUpload.bind(this)} style={{opacity : 0}} />
                
                    </div>

                    <div id="image-gallery-detail"> 
                        <SelectedImage image={this.state.selected} selectFromWorker={Picker.accept.bind(Picker, { type: ImagePicker.slug, [ImagePicker.slug] : this.state.selected })} />       
                    </div>
                </div>
            </div>
        )
    }
}
