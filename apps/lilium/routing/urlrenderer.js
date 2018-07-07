import { h, Component } from 'preact'

// Import default pages from route
import InitPage     from '../pages/default';
import Dashboard    from '../pages/dashboard/index';
import e404         from '../pages/errors/404';

// Default endpoints are provided here
export class EndpointStore {
    static registerEndpoint(endpointname, componentClass) {
        if (EndpointStore.ENDPOINT_STORE[endpointname]) {
            throw new Error("Endpoint already exists : " + endpointname);
        } 

        EndpointStore.ENDPOINT_STORE[endpointname] = componentClass;
    }

    static replaceDefaultEndpoint(endpointname, componentClass) {
        if (!EndpointStore.ENDPOINT_STORE[endpointname]) {
            throw new Error("Endpoint does not exist : " + endpointname);
        } 

        EndpointStore.ENDPOINT_STORE[endpointname] = componentClass;
    }

    static getComponentFromEndpoint(endpointname) {
        return EndpointStore.ENDPOINT_STORE[endpointname] || 
            EndpointStore.ENDPOINT_STORE._e404;
    }
}

// Only way to define static properties for now (Javascript! What are you doing?!)
EndpointStore.ENDPOINT_STORE = {};

// Define default Lilium's endpoints
EndpointStore.registerEndpoint("_init", InitPage);
EndpointStore.registerEndpoint('_e404', e404);
EndpointStore.registerEndpoint('dashboard', Dashboard);

export class URLRenderer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            endpoint : "_init",
            levels : []
        }
    }

    componentDidMount() {
        document.addEventListener('navigate', ev => {
            const path = "/lilium" + ev.detail.href;
            window.history.pushState(path, undefined, path);
            this.refreshPath();
        });

        if (document.location.pathname.substring(1).split('/').length == 1) {
            window.history.pushState("/lilium/dashboard", undefined, "/lilium/dashboard");
        }

        this.refreshPath();
    }

    refreshPath() {
        const paths = document.location.pathname.substring(1).split('/');
        paths.shift();

        const endpoint = paths.shift();
        const levels = paths;

        this.setState({ endpoint, levels });
    }

    render() {
        const Container = EndpointStore.getComponentFromEndpoint(this.state.endpoint); 
        
        return (
            <div id="urlrenderer">
                <Container endpoint={this.state.endpoint} levels={this.state.levels} />
            </div>
        )
    }
}