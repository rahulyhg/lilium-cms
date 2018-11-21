import { h, Component } from 'preact'
import { resetPageCommands } from '../layout/lys';
import { CACHEKEYS, getLocal } from '../data/cache';
import { dismissOverlay } from '../overlay/overlaywrap';
import { hit } from '../realtime/connection';

// Import default pages from route
import InitPage         from '../pages/default';
import Dashboard        from '../pages/dashboard/index';
import Publishing       from '../pages/publishing/index';
import ProfilePage      from '../pages/me/index.js';
import TopicsManagement from '../pages/topics/index';
import Preferences      from '../pages/preferences/index.js';
import Entities         from '../pages/entities/index.js';
import Roles            from '../pages/roles/index.js';
import Ponglinks        from '../pages/ponglinks/index.js';
import StyledPages      from '../pages/styledpages/index.js';
import MailTemplates    from '../pages/mailtemplates/index.js';
import ContentChains    from '../pages/contentchains/index.js';
import Logout           from '../pages/logout/index';
import TheDailyLilium   from '../pages/thedailylilium/index';
import DevTools         from '../pages/devtools/index.js';
import translations     from '../pages/translations/index.js';
import SettingsPage     from '../pages/settings/index.js';
import Notifs           from '../pages/notifications/index';
import ThemesPage       from '../pages/themes/index';
import AdsManagement    from '../pages/ads/index';
import CommentsMan      from '../pages/comments/index';
import PluginsMan       from '../pages/plugins/index';
import CakepopsMan      from '../pages/cakepops/index';
import FlaggingMan      from '../pages/flagging/index';
import StaffingPage     from '../pages/staffing/index';
import PwManager        from '../pages/pwmanager/index';
import PaymentDashboard from '../pages/paymentsdashboard/index';
import PaymentsReport  from '../pages/reportgenerator/index';
import e404             from '../pages/errors/404';
import e403             from '../pages/errors/403';


// Default endpoints are provided here
export class EndpointStore {
    // Registers a new endpoint with a new component
    static registerEndpoint(endpointname, componentClass) {
        if (EndpointStore.ENDPOINT_STORE[endpointname]) {
            throw new Error("Endpoint already exists : " + endpointname);
        } 

        EndpointStore.ENDPOINT_STORE[endpointname] = componentClass;
    }

    // Overrides an endpoint component
    static replaceDefaultEndpoint(endpointname, componentClass) {
        if (!EndpointStore.ENDPOINT_STORE[endpointname]) {
            throw new Error("Endpoint does not exist : " + endpointname);
        } 

        EndpointStore.ENDPOINT_STORE[endpointname] = componentClass;
    }

    // Returns a component associated with an endpoint, or an error page
    static getComponentFromEndpoint(endpointname) {
        return liliumcms.session.allowedEndpoints.includes(endpointname) ? 
            EndpointStore.ENDPOINT_STORE[endpointname] || EndpointStore.ENDPOINT_STORE._e404 : 
            EndpointStore.ENDPOINT_STORE._e403;
    }

    // All registered endpoints
    static ENDPOINT_STORE = {};
}

// Define default Lilium's endpoints
EndpointStore.registerEndpoint("_init", InitPage);
EndpointStore.registerEndpoint('dashboard', Dashboard);
EndpointStore.registerEndpoint('publishing', Publishing);
EndpointStore.registerEndpoint('me', ProfilePage);
EndpointStore.registerEndpoint('preferences', Preferences);
EndpointStore.registerEndpoint('entities', Entities);
EndpointStore.registerEndpoint('role', Roles);
EndpointStore.registerEndpoint('ponglinks', Ponglinks);
EndpointStore.registerEndpoint('styledpages', StyledPages);
EndpointStore.registerEndpoint('mailtemplates', MailTemplates);
EndpointStore.registerEndpoint('chains', ContentChains);
EndpointStore.registerEndpoint('logout', Logout);
EndpointStore.registerEndpoint('devtools', DevTools);
EndpointStore.registerEndpoint('topics', TopicsManagement);
EndpointStore.registerEndpoint('thedailylilium', TheDailyLilium);
EndpointStore.registerEndpoint('translations', translations);
EndpointStore.registerEndpoint('settings', SettingsPage);
EndpointStore.registerEndpoint('notifications', Notifs);
EndpointStore.registerEndpoint('themes', ThemesPage);
EndpointStore.registerEndpoint('ads', AdsManagement);
EndpointStore.registerEndpoint('comments', CommentsMan);
EndpointStore.registerEndpoint('plugins', PluginsMan);
EndpointStore.registerEndpoint('cakepop', CakepopsMan); 
EndpointStore.registerEndpoint('flagging', FlaggingMan);
EndpointStore.registerEndpoint('staffing', StaffingPage);
EndpointStore.registerEndpoint('pwmanager', PwManager);
EndpointStore.registerEndpoint('paymentdashboard', PaymentDashboard);
EndpointStore.registerEndpoint('paymentreports', PaymentsReport);
EndpointStore.registerEndpoint('_e404', e404);
EndpointStore.registerEndpoint('_e403', e403);

// Main router using URL routes
export class URLRenderer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            endpoint : "_init",
            levels : [],
            classes : [],
            rendererstyle : {}
        }

        // Look for user preference to set whether the UI is stretched or not 
        getLocal(CACHEKEYS.SIDEBARSNAP) && this.state.classes.push("snap");
        this.props.session.preferences.stretchUserInterface && this.state.classes.push("stretched")
    }

    componentDidMount() {
        log('URLRenderer', 'Finished mounting a URL Renderer', 'url');

        // The event `navigate` will accept an `href` as detail
        document.addEventListener('navigate', ev => {
            const path = "/lilium" + ev.detail.href;
            window.history.pushState(path, undefined, path);
            this.refreshPath(ev.detail.extras);
        });

        // The event `togglestretchui` will let other components stretch the UI
        document.addEventListener('togglestretchui', ev => {
            const classes = liliumcms.session.preferences.stretchUserInterface ? 
                [...this.state.classes, 'stretched'] : 
                this.state.classes.filter(x => x != "stretched");
            
            this.setState({ classes })
        });

        // Remove slash at the end of URL without pushing to history
        if (document.location.pathname.substring(1).split('/').length == 1) {
            log('URLRenderer', 'Pushing a URL state to window history', 'url');
            window.history.pushState("/lilium/dashboard", undefined, "/lilium/dashboard");
        }

        // Event fired when the user clicks on the "back" button of the browser
        window.onpopstate = () => {
            log("URLRenderer", 'Handling popstate event', 'url');
            this.refreshPath();
        };

        // Event bindings for sidebar snap and slide
        this.menuslid_bound = this.menuslid.bind(this);
        this.menusnapped_bound = this.menusnapped.bind(this);
        document.addEventListener('menuslid', this.menuslid_bound);
        document.addEventListener('menusnap', this.menusnapped_bound);

        // Call statis methods of all registered components
        this.callStaticRegisterMethods();

        // Render
        this.refreshPath();
    }

    callStaticRegisterMethods() {
        log('URLRenderer', 'Calling static componentDidRegister methods of all endpoints', 'url');
        
        // If a registered component defines a `componentDidRegister` method, it will be called here
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

    updateBodyClass(endpoint) {
        document.body.classList.remove("endpoint-" + this.state.endpoint);
        document.body.classList.add("endpoint-" + endpoint);
    }

    refreshPath(extras= {}) {
        // Remove `lilium` from URL path for parsing
        const paths = document.location.pathname.substring(1).split('/');
        paths.shift();

        // Endpoint is always the first URL level
        const endpoint = paths.shift();

        // The rest of the URL is an array of levels
        const levels = paths;

        log('URLRenderer', 'Refreshing URL state with endpoint : ' + endpoint, 'url');

        // If the previous page defined custom command, remove them
        resetPageCommands();

        // Get component to render based on the new endpoint
        const CurrentContainer = EndpointStore.getComponentFromEndpoint(endpoint);
        this.updateBodyClass(endpoint);

        // Prepare for render
        this.setState({ endpoint, levels, CurrentContainer, extras, rendererstyle : CurrentContainer.rendererstyle || {} }, () => {
            // Once the URLRenderer has rendered the component, fire event with a few details
            const ev = new CustomEvent("renderedURL", { detail : { endpoint, levels, CurrentContainer} });
            document.dispatchEvent(ev);

            // Send page view to upstream websocket
            hit();

            // Close all open overlays
            dismissOverlay();
        });
    }

    render() {
        // Store last rendered path to avoid double-renders
        this.lastRenderedPath = document.location.pathname;
        log('URLRenderer', 'Rendering component at endpoint : ' + this.state.endpoint, 'layout');

        // Store reference to div for quick DOM modifications, update CSS classes
        return (
            <div id="urlrenderer" ref={x => (this.renderer = x)} class={this.state.classes.join(' ')} style={this.state.rendererstyle}>
                <this.state.CurrentContainer endpoint={this.state.endpoint} levels={this.state.levels} session={this.props.session} extras={this.state.extras || {}} />
            </div>
        )
    }
}
