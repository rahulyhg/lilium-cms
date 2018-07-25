import { h, Component } from 'preact';
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
        this.imgtag && this.imgtag.removeAttribute('src');
        this.setState({
            selected : props.image
        })
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
                <img ref={img => this.imgtag = img} src={document.location.protocol + ("//www.narcity.com" || liliumcms.url) + "/" + this.state.selected.fullurl} class="image-picker-selected-full" />
                <b>{this.state.selected.fullurl}</b>
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
        const initState = { params, visible : true, selected : undefined };
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

        _singleton.state.callback && _singleton.state.callback(_singleton.state.selected);
    }

    keydown(ev) {
        ev.keyCode == "27" && ImagePicker.dismiss();
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
                    </div>

                    <div id="image-gallery">
                    {
                        this.state.images.map(x => (<ImageThumbnail image={x} selected={this.state.selected && this.state.selected == x} clicked={this.imageClicked.bind(this)} />))
                    }
                    </div>

                    <div id="image-gallery-detail"> 
                        <SelectedImage image={this.state.selected} />       
                    </div>
                </div>
            </div>
        )
    }
}