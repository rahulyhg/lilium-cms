import { Component, h } from 'preact';

export class Link extends Component {
    constructor(props) {
        super(props);
        this.linkStyle = props.display || props.linkStyle || "inline"
    }

    navigate() {
        log('Link', 'Link was clicked with href : ' + this.props.href, 'detail');
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

export function navigateTo(href, extras = {}) {
    log('Link', 'Hard navigation from code to href : ' + href, 'detail');
    const ev = new CustomEvent("navigate", { detail : { href, extras } });
    document.dispatchEvent(ev);    
}