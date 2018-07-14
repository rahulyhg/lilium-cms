import { Component, h } from 'preact';
import { Link } from '../routing/link';

export class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : undefined
        }
    }

    componentWillReceiveProps(props) {
        if (props.session) {
            this.setState({session : props.session});
        }
    }

    render() {
        log('Header', 'Rendering header component', 'layout');
        if (!this.state.session) {
            return (<header></header>);
        }

        return (
            <header>
                <Link display="inline" href="/dashboard">
                    <div id="lilium-logo-wrapper">
                        <img id="lilium-logo" src="/static/media/lmllogo.png" />
                        <span id="lilium-brandname" class="ptext">Lilium CMS</span>
                    </div>
                </Link>
            </header>
        )
    }
}
