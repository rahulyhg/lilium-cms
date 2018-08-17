import { h, Component } from 'preact'

const OVERLAY_COLLECTION = {};

export function registerOverlay(id, component) {
    OVERLAY_COLLECTION[id] = component;
}

export function castOverlay(id, extra) {
    OverlayWrap.cast(id, extra);
}

export function dismissOverlay() {
    OverlayWrap.dismiss();
}

let _singleton;
export class OverlayWrap extends Component {
    constructor(props) {
        super(props);
        this.state = {};

        _singleton = this;
    }

    static cast(id, extra) { _singleton.cast(id, extra); }
    static dismiss(id)     { _singleton.dismiss(id);     }

    cast(id, extra) {
        this.setState({
            visible : true,
            component : OVERLAY_COLLECTION[id],
            extra
        });
    }

    dismiss() {
        this.setState({ visible : false })
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    render() {
        if (!this.state.visible) {
            return null;
        }

        return (
            <div id="fullscreen-overlay">
                <this.state.component extra={this.state.extra} />
            </div>
        )
    }
}