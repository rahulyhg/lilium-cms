import {h, Component} from 'preact';

class OverlaySlideLeft extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div class="overlay-slide-left">
                <div class="overlay-slide-left-floater">
                    <div>
                        <img class="overlay-slide-lilium-logo" src="/static/media/lmllogo.png" />
                    </div>
                    <div class="overlay-slide-title">{this.props.title}</div>                
                    <div class="overlay-slide-subtitle">{this.props.subtitle || liliumcms.sitename}</div>
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
            <div class="overlay-slide-right">
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
                <div class="overlay-slides">
                    <OverlaySlideLeft title={this.props.options.title} subtitle={this.props.options.subtitle} />
                    <OverlaySlideRight component={this.props.component} extra={this.props.extra} />
                </div>
            )
        }
    }
}