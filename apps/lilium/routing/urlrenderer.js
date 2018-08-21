import { h, Component } from 'preact'
import { resetPageCommands } from '../layout/lys';
import { CACHEKEYS, getLocal } from '../data/cache';
import { dismissOverlay } from '../overlay/overlaywrap';

// Import default pages from route
import InitPage     from '../pages/default';
import Dashboard    from '../pages/dashboard/index';
import Publishing   from '../pages/publishing/index';
import ProfilePage  from '../pages/me/index.js';
import Preferences  from '../pages/preferences/index.js';
import Entities     from '../pages/entities/index.js';
import Roles        from '../pages/roles/index.js';
import Ponglinks    from '../pages/ponglinks/index.js';
import Logout       from '../pages/logout/index';
import DevTools     from '../pages/devtools/index.js';
import translations from '../pages/translations/index.js';
import SettingsPage from '../pages/settings/index.js';
import Notifs       from '../pages/notifications/index';
import ThemesPage   from '../pages/themes/index';
import CommentsMan  from '../pages/comments/index';
import e404         from '../pages/errors/404';
import e403         from '../pages/errors/403';


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
        return liliumcms.session.allowedEndpoints.includes(endpointname) ? 
            EndpointStore.ENDPOINT_STORE[endpointname] || EndpointStore.ENDPOINT_STORE._e404 : 
            EndpointStore.ENDPOINT_STORE._e403;
    }
}

// Only way to define static properties for now (Javascript! What are you doing?!)
EndpointStore.ENDPOINT_STORE = {};

// Define default Lilium's endpoints
EndpointStore.registerEndpoint("_init", InitPage);
EndpointStore.registerEndpoint('dashboard', Dashboard);
EndpointStore.registerEndpoint('publishing', Publishing);
EndpointStore.registerEndpoint('me', ProfilePage);
EndpointStore.registerEndpoint('preferences', Preferences);
EndpointStore.registerEndpoint('entities', Entities);
EndpointStore.registerEndpoint('role', Roles);
EndpointStore.registerEndpoint('ponglinks', Ponglinks);
EndpointStore.registerEndpoint('logout', Logout);
EndpointStore.registerEndpoint('devtools', DevTools);
EndpointStore.registerEndpoint('translations', translations);
EndpointStore.registerEndpoint('settings', SettingsPage);
EndpointStore.registerEndpoint('notifications', Notifs);
EndpointStore.registerEndpoint('themes', ThemesPage);
EndpointStore.registerEndpoint('comments', CommentsMan);
EndpointStore.registerEndpoint('_e404', e404);
EndpointStore.registerEndpoint('_e403', e403);

export class URLRenderer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            endpoint : "_init",
            levels : [],
            classes : []
        }

        getLocal(CACHEKEYS.SIDEBARSNAP) && this.state.classes.push("snap");
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

        this.menuslid_bound = this.menuslid.bind(this);
        this.menusnapped_bound = this.menusnapped.bind(this);
        document.addEventListener('menuslid', this.menuslid_bound);
        document.addEventListener('menusnap', this.menusnapped_bound);

        this.callStaticRegisterMethods();
        this.refreshPath();
    }

    callStaticRegisterMethods() {
        log('URLRenderer', 'Calling static componentDidRegister methods of all endpoints', 'url');
        Object.keys(EndpointStore.ENDPOINT_STORE).forEach(endpoint => 
            liliumcms.session.allowedEndpoints.includes(endpoint) &&
            EndpointStore.ENDPOINT_STORE[endpoint].componentDidRegister &&
            EndpointStore.ENDPOINT_STORE[endpoint].componentDidRegister()
        );
    }

    componentWillReceiveProps(props) {

    }

    componentWillUnmount() {
        document.removeEventListener('menuslid', this.menuslid_bound)
    }

    menuslid(ev) {
        this.renderer.classList[ev.detail.slid ? "add" : "remove"]("slid");
    }

    menusnapped(ev) {
        this.renderer.classList[ev.detail.snapped ? "add" : "remove"]("snap");
        this.state.classes = ev.detail.snapped ? ["snap"] : [];
    }

    refreshPath() {
        const paths = document.location.pathname.substring(1).split('/');
        paths.shift();

        const endpoint = paths.shift();
        const levels = paths;

        log('URLRenderer', 'Refreshing URL state with endpoint : ' + endpoint, 'url');
        resetPageCommands();

        const CurrentContainer = EndpointStore.getComponentFromEndpoint(endpoint);
        this.setState({ endpoint, levels, CurrentContainer }, () => {
            const ev = new CustomEvent("renderedURL", { detail : { endpoint, levels, CurrentContainer} });
            document.dispatchEvent(ev);

            dismissOverlay();
        });
    }

    render() {
        this.lastRenderedPath = document.location.pathname;
        log('URLRenderer', 'Rendering component at endpoint : ' + this.state.endpoint, 'layout');
        return (
            <div id="urlrenderer" ref={x => (this.renderer = x)} class={this.state.classes.join(' ')}>
                <this.state.CurrentContainer endpoint={this.state.endpoint} levels={this.state.levels} session={this.props.session} />
            </div>
        )
    }
}