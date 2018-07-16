import { h, Component } from 'preact'
import { resetPageCommands } from '../layout/lys';

// Import default pages from route
import InitPage     from '../pages/default';
import Dashboard    from '../pages/dashboard/index';
import Publishing   from '../pages/publishing/index';
import ProfilePage  from '../pages/me/index.js';
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
EndpointStore.registerEndpoint('dashboard', Dashboard);
EndpointStore.registerEndpoint('publishing', Publishing);
EndpointStore.registerEndpoint('me', ProfilePage);
EndpointStore.registerEndpoint('_e404', e404);

export class URLRenderer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            endpoint : "_init",
            levels : []
        }
    }

    componentDidMount() {
        log('URLRenderer', 'Finished mounting a URL Renderer', 'url');
        document.addEventListener('navigate', ev => {
            const path = "/lilium" + ev.detail.href;
            window.history.pushState(path, undefined, path);
            this.refreshPath();
        });

        if (document.location.pathname.substring(1).split('/').length == 1) {
            log('URLRenderer', 'Pushing a URL state to window history', 'url');
            window.history.pushState("/lilium/dashboard", undefined, "/lilium/dashboard");
        }

        window.onpopstate = () => {
            log("URLRenderer", 'Handling popstate event', 'url');
            this.refreshPath();
        };

        this.refreshPath();
    }

    refreshPath() {
        const paths = document.location.pathname.substring(1).split('/');
        paths.shift();

        const endpoint = paths.shift();
        const levels = paths;

        log('URLRenderer', 'Refreshing URL state with endpoint : ' + endpoint, 'url');
        resetPageCommands();
        this.setState({ endpoint, levels });
    }

    render() {
        const Container = EndpointStore.getComponentFromEndpoint(this.state.endpoint); 
        
        log('URLRenderer', 'Rendering component at endpoint : ' + this.state.endpoint, 'layout');
        return (
            <div id="urlrenderer">
                <Container endpoint={this.state.endpoint} levels={this.state.levels} />
            </div>
        )
    }
}