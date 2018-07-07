import { Component, h } from 'preact';
import { Link } from '../routing/link';

export class Header extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <header>
                <Link display="inline" href="/">
                    <img id="lilium-logo" src="/static/media/lmllogo.svg" />
                    <span id="lilium-brandname">Lilium CMS</span>
                </Link>
            </header>
        )
    }
}
