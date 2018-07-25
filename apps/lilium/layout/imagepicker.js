import { h, Component } from 'preact';
import API from '../data/api';

const styles = {
    bigtitle : {
        fontSize: 28,
        padding: "8px 0px 1px",
        display: "block",
        margin: "10px 20px",
        borderBottom: "1px solid #CCC"
    }
}

class ImageThumbnail extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected : false
        };
    }

    clicked(ev) {
        this.setState({ selected : true });
        this.props.clicked(this.props.image, this);
    }

    render() {
        return (
            <img onClick={this.clicked.bind(this)} class="image-picker-thumb" src={this.props.image.sizes.square.url} />
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
        _singleton.setState({ params, visible : true });
        window.addEventListener('keydown', _singleton.keydown_bound);
    }

    static dismiss() {
        log('ImagePicker', 'Dismissing image picker singlethon', 'detail');
        _singleton.setState({ visible : false });
        window.removeEventListener('keydown', _singleton.keydown_bound);

        this.state.callback && this.state.callback(this.state.selected);
    }

    keydown(ev) {
        ev.keyCode == "27" && ImagePicker.dismiss();
    }

    fetchLatest() {
        API.get('/uploads', { limit : 100, skip : 0 }, (err, uploads) => {
            this.setState({ images : uploads });
        })
    }

    componentDidMount() {
        this.fetchLatest();
    }

    imageClicked(selected, comp) {
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
                        this.state.images.map(x => (<ImageThumbnail image={x} clicked={this.imageClicked.bind(this)} />))
                    }
                    </div>

                    <div id="image-gallery-detail">
                        
                    </div>
                </div>
            </div>
        )
    }
}