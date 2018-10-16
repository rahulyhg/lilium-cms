import {h, Component} from 'preact';

class OverlaySlideLeft extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="overlay-slide-left">
                <div id="overlay-slide-left-floater">
                    <div class="font2" id="overlay-slide-title">{this.props.title}</div>                
                    <div id="overlay-slide-subtitle">{this.props.subtitle || liliumcms.sitename}</div>
                </div>
            </div>
        );
    }
}

class OverlaySlideRight extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="overlay-slide-right">
                <this.props.component extra={ this.props.extra } />
            </div>
        )
    }
}

export class OverlaySlides extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        if (this.props.options.customlayout) {
            return (<this.props.component extra={this.props.extra} title={this.props.options.title} subtitle={this.props.options.subtitle} />)
        } else {
            return (
                <div id="overlay-slides">
                    <OverlaySlideLeft title={this.props.options.title} subtitle={this.props.options.subtitle} />
                    <OverlaySlideRight component={this.props.component} extra={this.props.extra} />
                </div>
            )
        }
    }
}