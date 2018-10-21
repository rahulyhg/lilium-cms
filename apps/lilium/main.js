import { Component, h, render } from 'preact';
import { makeGlobalLogger } from './data/logger';
import { Header } from './layout/header'
import { LiliumMenu } from './layout/menu';
import { URLRenderer } from './routing/urlrenderer';
import { ImagePicker } from './layout/imagepicker';
import { PlacePicker } from './layout/placepicker';
import { LoadingView } from './layout/loading';
import { OverlayWrap } from './overlay/overlaywrap';
import { Lys } from './layout/lys';
import { initiateConnection } from './realtime/connection';
import { initializeDevEnv, DevTools } from './dev/env';
import { initLocal, setSession, mapUsers } from './data/cache';
import { NotificationWrapper, castNotification } from './layout/notifications';
import { makeGLobalLang, setLanguage } from './data/vocab';
import { CakepopWrapper } from './layout/cakepopsmanager';
import API from './data/api';

// LILIUM_IMPORT_TEMPLATE

makeGlobalLogger();
makeGLobalLang();

if (liliumcms.env == "dev") {
    initializeDevEnv();
}

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

        window.addEventListener('offline', () => {
            castNotification({
                title: "Internet connection lost, modifications will not be saved",
                message: "You went offline, any modifications you make now will not be saved to the server",
                type: "warning"
            });
        });

        window.addEventListener('online', () => {
            castNotification({
                title: "Internet connection established",
                message: "You are now connected to the Internet",
                type: "success"
            });
        });

        document.addEventListener('castexitscreen', () => {
            this.setState({ loading : true });
        });
    }

    fetchUserData() {        
        log('Lilium', 'Requesting current session information', 'lilium');
        API.getMany([
            { endpoint : '/me', params : {} },
            { endpoint : "/adminmenus", params : {} },
            { endpoint : "/entities/simple", params : {} }
        ], (err, resp) => {
            if (!resp["/me"] || !resp["/me"][0]) {
                this.setState({ error : "session", loading : false });
            } else {
                log('Lilium', 'Hello, ' + resp["/me"][0].displayname + '!', 'success');
                const currentLanguage = resp['/me'][0].language || 'en-ca';
                setLanguage(currentLanguage, () => {
                    setSession("entities", resp["/entities/simple"]);
                    setSession("mappedEntities", mapUsers(resp["/entities/simple"]));
                    liliumcms.session = resp["/me"][0];
                    liliumcms.session.allowedEndpoints = [
                        "me", "preferences", "logout", "notifications", 
                        ...resp["/adminmenus"].map(x => x.absURL.split('/')[1])
                    ];

                    resp["/adminmenus"]
                        .filter(x => x.children && x.children.length != 0)
                        .map(x => x.children)
                        .forEach(x => 
                            x.forEach(y => 
                                liliumcms.session.allowedEndpoints.push(y.absURL.split('/')[1]
                            )
                        )
                    );

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
                <CakepopWrapper />
                <ImagePicker />
                <PlacePicker />
                <OverlayWrap />

                { liliumcms.env == "dev" ? <DevTools /> : null }
            </div>
        );
    }
}

log('Lilium', 'Lilium CMS V4, about to blow your mind in a million pieces.', 'lilium');
render(<Lilium />, document.getElementById('app'));