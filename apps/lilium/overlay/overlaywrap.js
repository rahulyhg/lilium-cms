import { h, Component } from 'preact';
import { OverlaySlides } from './overlayslides';

const OVERLAY_COLLECTION = {};

export function registerOverlay(id, component, options = {}) {
    OVERLAY_COLLECTION[id] = {
        component, options
    };
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

    static cast(id, extra = {}) { _singleton.cast(id, extra); }
    static dismiss(id)          { _singleton.dismiss(id);     }

    cast(id, extra = {}) {
        this.setState({
            visible : true,
            extra,
            ...OVERLAY_COLLECTION[id],
        });

        document.body.classList.add('scroll-lock');
    }

    dismiss() {
        this.setState({ visible : false });
        document.body.classList.remove('scroll-lock');
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
                <OverlaySlides options={this.state.options} extra={this.state.extra} component={this.state.component} />
            </div>
        )
    }
}
