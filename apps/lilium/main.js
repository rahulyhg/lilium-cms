import { Component, h, render } from 'preact';
import { makeGlobalLogger } from './data/logger';
import { Header } from './layout/header'
import { LiliumMenu } from './layout/menu';
import { URLRenderer } from './routing/urlrenderer';
import { ImagePicker } from './layout/imagepicker';
import { LoadingView } from './layout/loading';
import { Lys } from './layout/lys';
import { initiateConnection } from './realtime/connection';
import { initializeDevEnv, DevTools } from './dev/env';
import { initLocal, setSession } from './data/cache';
import { NotificationWrapper } from './layout/notifications';
import { makeGLobalLang, setLanguage } from './data/vocab';
import API from './data/api';

// LILIUM_IMPORT_TEMPLATE

makeGlobalLogger();
makeGLobalLang();

if (liliumcms.env == "dev") {
    initializeDevEnv();
}makeGLobalLang

class Lilium extends Component {
    constructor(props) {
        super(props);        
        this.state = {
            loading : true
            /* session, menus, headerTitle */
        };

        // Initialize cache
        initLocal();

        // Realtime socket
        initiateConnection();

        log('Lilium', 'Created Main app component', 'lilium');
    }

    componentDidMount() {
        log('Lilium', 'Main component finished mounting', 'lilium');
        this.fetchUserData();
    }

    fetchUserData() {        
        log('Lilium', 'Requesting current session information', 'lilium');
        API.getMany([
            { endpoint : '/me', params : {} },
            { endpoint : "/adminmenus", params : {} },
            { endpoint : "/notifications", params : {} },
            { endpoint : "/entities/simple", params : {} }
        ], (resp) => {
            if (!resp["/me"] || !resp["/me"][0]) {
                this.setState({ error : "session", loading : false });
            } else {
                log('Lilium', 'Hello, ' + resp["/me"][0].displayname + '!', 'success');
                const currentLanguage = resp['/me'][0].language || 'en-ca';
                setLanguage(currentLanguage, () => {
                    setSession("entities", resp["/entities/simple"]);
                    resp["/me"].notifications = resp["/notifications"];
                    this.setState({ session : resp["/me"][0], menus : resp["/adminmenus"], loading : false, currentLanguage });            
                });
            }   
        });
    }

    render() {
        log('Lilium', 'Rendering Lilium application into DOM', 'lilium');
        if (this.state.loading) {
            return (<LoadingView />);
        }

        if (this.state.error) {
            return (
                <div>Error loading Lilium : {this.state.error}</div>
            )
        }

        return (
            <div id="lilium">
                <Header session={this.state.session} />
                <LiliumMenu menus={this.state.menus} />
                <URLRenderer session={this.state.session} />
                <Lys menus={this.state.menus} session={this.state.session} />
                <NotificationWrapper />
                <ImagePicker />

                { liliumcms.env == "dev" ? <DevTools /> : null }
            </div>
        );
    }
}

log('Lilium', 'Lilium CMS V4, about to blow your mind in a million pieces.', 'lilium');
render(<Lilium />, document.getElementById('app'));