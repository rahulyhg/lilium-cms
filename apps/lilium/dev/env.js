import API from '../data/api';
import { h, Component } from 'preact';

export function initializeDevEnv() {
    log('Dev', 'Initialize development environment', 'detail');
    global.__REBUILD_LILIUM_V4 = API.rebuild;

    log('Dev', 'Ready for some development', 'success');
    log('Dev', 'In the console, you can rebuild Lilium V4 by calling __REBUILD_LILIUM_V4()', 'lilium');
}

const styles = {
    devtools : {
        position: "fixed",
        bottom: 0,
        left: 0,
        borderTop : "3px solid #af57e4",
        transition: "all 0.3s"
    },
    btn : {
        padding: 12,
        color: "#af57e4",
        fontWeight: "bold",
        cursor: "pointer",
        display: "inline-block",
        textAlign : 'center'
    },
    title : {
        padding: 12,
        backgroundColor: "#af57e4",
        color: "#FFF",
        fontWeight: "bold",
        display: "inline-block",
        cursor: "pointer"
    }
}

class DevTool extends Component {
    clicked(ev) {
        this.setState({loading : true});
        this.props.click();
    }

    render() {
        return (
            <div onClick={this.clicked.bind(this)} style={styles.btn}>
                <b style={this.state.loading ? {display : "none"} : {}}>{this.props.children}</b>
                <i class={"fa fa-spin fa-sync"} style={this.state.loading ? {display : "inline-block"} : { display : "none" }}></i>
            </div>
        );
    }
}

export class DevTools extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hidden : true
        }
    }

    bundleJS() {
        log('Dev', 'Sent request to bundle V4... The browser will refresh shortly', 'lilium');
        API.rebuild();
    }

    toggle() {
        this.setState({ hidden : !this.state.hidden });
    }

    render() {
        log('Dev', 'Displaying dev tools bar', 'lilium');
        return (
            <div style={styles.devtools} class={"devtool-strip " + (this.state.hidden ? "hidden" : "")}>
                <b onClick={this.toggle.bind(this)} style={styles.title}>Dev Tools</b>

                { this.state.hidden ? null : (
                    <DevTool click={this.bundleJS.bind(this)}>Bundle JS</DevTool>
                ) }
            </div>
        );
    }
}