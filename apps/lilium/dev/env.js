import API from '../data/api';
import { h, Component } from 'preact';
import { ImagePicker } from '../layout/imagepicker';
import { castNotification } from '../layout/notifications';
import { addCommand } from '../layout/lys.js';
import { dumpCache } from '../data/cache';

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
        transition: "all 0.3s",
        zIndex : 100,
        display: "flex"
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
    },
    errorscreen : {
        position: "fixed",
        top : 0,
        left : 0,
        width: "100%",
        height : "100%",
        backgroundColor : "rgba(105, 12, 12, 0.97)",
        color : "white",
        zIndex : 1000
    }
}

class DevTool extends Component {
    clicked(ev) {
        this.setState({loading : true});
        this.props.click(() => {
            this.setState({loading : false});
        });
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

    componentDidMount() {
        window.onerror = this.onerror.bind(this);
        addCommand({
            command : "bundle-js",
            displayname : "Bundle JS",
            execute : this.bundleJS.bind(this)
        });
    }

    onerror(error) {
        this.setState({ error })
    }

    bundleJS() {
        log('Dev', 'Sent request to bundle V4... The browser will refresh shortly', 'lilium');
        const event = new CustomEvent("castexitscreen");
        document.dispatchEvent(event);
        
        API.rebuild();
    }

    pickimage(done) {
        log('Dev', 'Casting image picker from dev tool', 'lilium');
        ImagePicker.cast({

        }, result => {
            
        });

        done();
        this.setState({ hidden : true });
    }

    testNotification(done) {
        const hasTimeout = Math.random() > 0.5;
        const type = ["success", "info", "warning", "error", "system"][Math.floor(Math.random() * 5)];

        castNotification({
            title : "Dev tools - " + (hasTimeout ? "With 5s timeout" : "Without timeout"),
            message : "["+type+"] This is a lot of fun! Here's a random number : " + Math.random().toString().substring(2),
            type : type,
            timeout : hasTimeout ? 5000 : 0
        });

        done();
    }

    toggle() {
        this.setState({ hidden : !this.state.hidden });
    }

    dumpApplicationCache(done) {
        log('Dev', 'Application cache dumped : ', 'lilium');
        console.log(dumpCache());
        
        done();
    }

    render() {
        if (this.state.error) {
            log('Dev', 'Displaying fullscreen error report', 'detail');
            console.error(this.state.error);
            
            return (
                <div style={styles.errorscreen}>
                    <h1>Crash handler</h1>
                    <h2>{this.state.error.toString()}</h2>
                    <pre>{this.state.error.stack}</pre>
                </div>
            )
        }

        log('Dev', 'Displaying dev tools bar', 'lilium');
        return (
            <div style={styles.devtools} class={"devtool-strip " + (this.state.hidden ? "hidden" : "")}>
                <b onClick={this.toggle.bind(this)} style={styles.title}>Dev Tools</b>

                { this.state.hidden ? null : (
                    <div>
                        <DevTool click={this.bundleJS.bind(this)}>Bundle JS</DevTool>
                        <DevTool click={this.pickimage.bind(this)}>Image picker</DevTool>
                        <DevTool click={this.testNotification.bind(this)}>Cast notification</DevTool>
                        <DevTool click={this.dumpApplicationCache.bind(this)}>Dump cache in console</DevTool>
                    </div>
                ) }
            </div>
        );
    }
}