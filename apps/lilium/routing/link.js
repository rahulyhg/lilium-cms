import { Component, h } from 'preact';

export class Link extends Component {
    constructor(props) {
        super(props);
        this.linkStyle = props.display || "inline"
    }

    navigate() {
        const ev = new CustomEvent("navigate", { detail : { href : this.props.href } });
        document.dispatchEvent(ev);
    }

    render() {
        return this.linkStyle == "inline" ? (
            <span class="link inline-link" onClick={this.navigate.bind(this)}>{this.props.children}</span>
        ) : (
            <div  class="link block-link"  onClick={this.navigate.bind(this)}>{this.props.children}</div>
        );
    }
}