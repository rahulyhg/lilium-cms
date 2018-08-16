import { h, Component } from "preact";
import { navigateTo } from '../../routing/link';

import DevToolAPI from './api';
import DevToolNotifications from './notifications'
import VirtualSession from './virtsesh'

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
        width: 150,
        height: 150,
        background: "rgb(231, 226, 232)",
        border: "2px solid #f5eef7",
        textAlign : 'center',
        cursor: "pointer",
        marginRight : 20
    },

    linkIcon : {
        display: "block",
        fontSize: 40,
        marginTop: 38,
        marginBottom: 8
    }
}

const DEVTOOLS = {
    api : DevToolAPI,
    notifications : DevToolNotifications,
    virtsesh : VirtualSession
}

class DevToolLink extends Component {
    clicked(ev) {
        navigateTo("/devtools/" + this.props.name);
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
                        <DevToolLink name="notifications" displayname="Notifications" icon="far fa-inbox" />
                        <DevToolLink name="virtsesh" displayname="Virtual Session" icon="far fa-sign-in" />
                    </div>
                </div>
            )
        }
    }
}