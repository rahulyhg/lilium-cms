import { h, Component } from "preact";
import { navigateTo } from '../../routing/link';

import DevToolAPI from './api';

const styles = {
    page : {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "calc(100vh - 50px)",
        bottom: 0,
        width: "100%",
    },

    link : {
        display: "inline-block",
        width: 100,
        height: 100,
        background: "rgb(231, 226, 232)",
        border: "2px solid #f5eef7",
        textAlign : 'center',
        cursor: "pointer"
    },

    linkIcon : {
        display: "block",
        fontSize: 40,
        marginTop: 20,
        marginBottom: 8
    }
}

const DEVTOOLS = {
    api : DevToolAPI
}

class DevToolLink extends Component {
    clicked(ev) {
        navigateTo("/devtools/api")
    }

    render() {
        return (
            <div style={styles.link} onClick={this.clicked.bind(this)}>
                <i class={this.props.icon} style={styles.linkIcon}></i>
                <span>{this.props.displayname}</span>
            </div>
        )
    }
}

export default class DevTools extends Component {
    constructor(props) {
        super(props);

    }

    render() {
        log('Devtools', 'Rendering devtools page', 'detail');
        if (this.props.levels[0]) {
            log('Devtools', 'Specific development tool rendering : ' + this.props.levels[0], 'detail');
            const Component = DEVTOOLS[this.props.levels[0]];
            return (
                <div id="devtool-page-wrapper">
                    <Component levels={this.props.levels} />
                </div>
            )
        } else {
            return (
                <div style={styles.page} class="graph-paper">
                    <h1>Development tools</h1>

                    <div style={{ padding: 15 }}>
                        <DevToolLink name="api" displayname="API" icon="fal fa-project-diagram" />
                    </div>
                </div>
            )
        }
    }
}