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
    }

    static cast(params, done) {
        _singleton.setState({ params, visible : true });
    }

    static dismiss() {
        _singleton.setState({ visible : false });
    }

    fetchLatest() {
        API.get('/uploads', { limit : 100, skip : 0 }, (err, uploads) => {
            this.setState({ images : uploads });
        })
    }

    componentDidMount() {
        this.fetchLatest();
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
                        this.state.images.map(x => (<img class="image-picker-thumb" src={x.sizes.square.url} />))
                    }
                    </div>

                    <div id="image-gallery-detail">        
                    {
                        this.state.selected ? (
                            <div>

                            </div>
                        ) : (
                            <div>
                                <b style={ styles.noimagetitle }>No image selected</b>
                                <i style={ styles.noimageicon } class="fal fa-image"></i>
                            </div>
                        )
                    }
                    </div>
                </div>
            </div>
        )
    }
}