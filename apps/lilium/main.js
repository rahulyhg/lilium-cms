/*  ------------------------------------------------------------------------------------------------
 *
 *  ░░      ░░ ░░      ░░ ░░    ░░ ░░░    ░░░     ░░░░░░ ░░░    ░░░ ░░░░░░░    ░░░     ░░░     ░░   
 *  ░░      ░░ ░░      ░░ ░░    ░░ ░░░░  ░░░░    ░░      ░░░░  ░░░░ ░░          ░░░   ░░░   ░░ ░░   
 *  ░░      ░░ ░░      ░░ ░░    ░░ ░░ ░░░░ ░░    ░░      ░░ ░░░░ ░░ ░░░░░░░      ░░░ ░░░   ░░  ░░   
 *  ░░      ░░ ░░      ░░ ░░    ░░ ░░  ░░  ░░    ░░      ░░  ░░  ░░      ░░       ░░░░░   ░░░░░░░░░ 
 *  ░░░░░░░ ░░ ░░░░░░░ ░░  ░░░░░░  ░░      ░░     ░░░░░░ ░░      ░░ ░░░░░░░        ░░░         ░░   
 *
 *  Preact app without any boilerplate or heavy dependency for Lilium Version 4+
 *
 *  The project uses a custom "router" called the URLRenderer. It is possible for components
 *  to register themselves in the URLRenderer, and define new routes.  
 *
 *  This is the main entry point of the app. The markup file using the app is located in the
 *  same directory as the entry point, and is names "index.html.js". Custom logic can be
 *  inserted directly in the index file, making is possible for plugin to require their 
 *  own extension of Lilium. 
 *
 *  Webpack and Babel are used to transpile the app for frontend use. A custom implementation of
 *  the Webpack dev server is available for quicker compilation and "hot reload". 
 *
 *  ------------------------------------------------------------------------------------------------
 *
 *  DIRECTORY STRUCTURE
 *
 *  data/
 *      api.js              Contains wrappers to the Lilium API.
 *      cache.js            Small utilities to make cache management easier.
 *      const.js            All constants and hardcoded values.
 *      logger.js           Logging function made global during bootstrapping.
 *      session.js          Class representing a user session with entity info.
 *      vocab.js            Internationalization utility made global during bootstrapping.
 *
 *  dev/
 *      env.js              Development features such as JS bundle from frontend and more
 *
 *  layout/
 *      cakepopsmanager.js  Overlay used to display Cakepops which are fullscreen messages
 *      embedpicker.js      Extends picker.js
 *      header.js           CMS header bar with notification dropdown and logo
 *      imagepicker.js      Extends picker.js
 *      loading.js          Fullscreen loading and spinner widget
 *      lys.js              Poweruser utility to make navigation and quick actions available
 *      menu.js             Sidebar menu
 *      notifications.js    Realtime active and passive notifications at the bottom
 *      picker.js           Fullscreen picker with upload capabilities
 *      placepicker.js      Extends picker.js
 *      titles.js           [Unused] Should represent a page title
 *      vectors.js          SVG wrapper with relative path to vector assets
 *
 *  realtime/
 *      connection.js       Functions used for binding on realtime events
 *      lmlsocket.js        Abstraction of websocket with utility methods
 *
 *  routing/
 *      link.js             Component triggering a router navigation on click
 *      urlrenderer.js      Lilium's full featured router
 *
 *  widgets/
 *      animenumber.js      A component that displays an animated number
 *      articlepicker.js    Form field used to select articles
 *      biglist.js          A lazyloading list of items with network calls and filters
 *      chart.js            Simple wrapper around the library ChartJs
 *      form.js             Multiple form fields including multiselect box and tags
 *      modal.js            Fullscreen overlay with a modal
 *      statusindicator.js  [Unused] SHould represent a status bubble
 *      tabview.js          Multiple components with a tab selector
 *      texteditor.js       Wrapper around the library TinyMCE
 *      timeago.js          Utility functions to convert timespans into the "ago" format
 *      treeview.js         Representation of data in the form of a tree (directory, files)
 *
 *  ------------------------------------------------------------------------------------------------
 */
import { Component, h, render } from 'preact';
import { makeGlobalLogger } from 'data/logger';
import { Header } from 'layout/header'
import { LiliumMenu } from 'layout/menu';
import { URLRenderer, EndpointStore } from 'routing/urlrenderer';
import { Picker } from 'layout/picker';
import { LoadingView } from 'layout/loading';
import { OverlayWrap } from 'overlay/overlaywrap';
import { PasswordReset } from 'layout/passwordreset';
import { Lys } from 'layout/lys';
import { LiliumSession } from 'data/session';
import { initiateConnection, bindRealtimeEvent } from 'realtime/connection';
import { initializeDevEnv, DevTools } from 'dev/env';
import { initLocal, setSession, mapUsers } from 'data/cache';
import { NotificationWrapper, castNotification } from 'layout/notifications';
import { fireEvent } from 'interactive/events';
import { setLanguage } from 'data/vocab';
import { CakepopWrapper } from 'layout/cakepopsmanager';
import { bind, bindFirst, unbind } from './syntheticEvents';

import API from 'data/api';

// Global access to session, connection state, URL
window.liliumcms = window.liliumcms || {};
liliumcms.session = new LiliumSession();
liliumcms.connected = true;

// Create `log` function
makeGlobalLogger();

// Make synthetic events library global in window.liliumcms
log('Lilium', "Making synthetic events library global in window.liliumcms", 'lilium');
window.liliumcms.bind = bind;
window.liliumcms.bindFirst = bindFirst;
window.liliumcms.unbind = unbind;

// If in dev mode, initialize dev functions
if (liliumcms.env == "dev") {
    initializeDevEnv();
}

// Main app component
export class Lilium extends Component {
    constructor(props) {
        super(props);        
        this.state = {
            loading : true
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

        // Fired when socket disconnects
        bindRealtimeEvent('disconnect', ev => {
            window.liliumcms.connected = false;
            fireEvent('disconnect');
            log('Socket', "Lost internet connection, notifying user", 'socket');

            castNotification({
                title: "Internet connection lost",
                message: "You went offline. Any pending requests will be processed once your connection is restored.",
                type: "warning"
            });
        });

        // Fired when socket connects after disconnecting
        bindRealtimeEvent('reconnect', ev => {
            log('Socket', "Internet connection restored, notifying user", 'socket');

            window.liliumcms.connected = true;
            fireEvent('reconnect');

            // Process all pending requests from when socket was offline
            API.processPendingRequests();

            castNotification({
                title: "Internet connection established",
                message: "You are now connected to the Internet",
                type: "success"
            });
        });

        bindRealtimeEvent('managecontractors', ev => {
            castNotification({
                title: 'Stripe has processed the payment successfully',
                message: 'Stripe has processed the payment(s) successfully.'
                        + 'Note that it may take a couple of business days for the contrctor to recieve it in their personnal bank account.',
                type: 'success'
            })
        });

        // Any component can cast the exit screen using an event
        document.addEventListener('castexitscreen', () => {
            this.setState({ loading : true });
        });
    }

    fetchUserData() { 
        log('Lilium', 'Requesting current session information', 'lilium');

        // Fetch current user, admin menus, simple version of all entities
        const originalRequests = [
            { endpoint : "/adminmenus", params : {} },
            { endpoint : "/entities/simple", params : {} }
        ];

        fireEvent("sessionWillFetch", originalRequests);
        API.get('/me', {}, (err, json, r) => {
            if (!json || !json[0]) {
                return this.setState({ error : err });
            }

            // Create new session object with current user's information
            liliumcms.session.setUser(json[0]);
            const currentLanguage = liliumcms.session.preferences && liliumcms.session.preferences.uiLanguage || 'english';

            fireEvent('sessionFetched', liliumcms.sesssion);

            fireEvent('liliumWillFetch', originalRequests);
            API.getMany(originalRequests, (err, resp) => {
                // If no session found or at least one error detected, abort and output
                fireEvent('liliumFetched', resp);

                if (Object.keys(err).filter(x => err[x]).length != 0) {
                    fireEvent('sessionFailed', err);
                    this.setState({ error : Object.keys(err).map(x => err[x]).join(', '), loading : false });
                } else {
                    log('Lilium', 'Hello, ' + liliumcms.session.displayname + '!', 'success');

                    // Set user language before rendering the UI
                    setLanguage(currentLanguage, languageInstance => {
                        fireEvent('languageLoaded', {
                            language : currentLanguage,
                            instance : languageInstance
                        });
                        
                        // Store all entities in session storage as well as mapped version of array
                        setSession("entities", resp["/entities/simple"]);
                        setSession("mappedEntities", mapUsers(resp["/entities/simple"]));


                        // Set allowed endpoints according to admin menus, plus hardcoded ones
                        liliumcms.session.addAllowedEndpoints([
                            "me", "preferences", "logout", "notifications", "onboarding", 
                            ...resp["/adminmenus"].map(x => x.absURL.split('/')[1]),
                        ]);

                        const nextState = {
                            session : liliumcms.session, menus : resp["/adminmenus"], loading : false, currentLanguage 
                        }

                        fireEvent('appWillRender', nextState);
                        // Let the show begins
                        this.setState(nextState, () => {
                            fireEvent('appRendered');
                        }); 
                    });
                }   
            });
        });
    }

    render() {
        // Original state, full screen loading view
        if (this.state.loading) {
            log('Lilium', 'Rendering Lilium loading overlay', 'lilium');
            return (<LoadingView />);
        }

        // Error view incase bootstrapping fails
        if (this.state.error) {
            log('Lilium', 'Rendering Lilium error overlay', 'lilium');
            return (
                <div style={{color:'white'}}>Error loading Lilium : {this.state.error}</div>
            )
        }

        log('Lilium', 'Rendering Lilium application into DOM', 'lilium');
        // Marvelous chaos 
        return (
            <div id="lilium">
                <Header session={this.state.session} />
                <LiliumMenu menus={this.state.menus} />
                <URLRenderer session={this.state.session} />
                <Lys menus={this.state.menus} session={this.state.session} />
                <PasswordReset />
                <NotificationWrapper />
                <CakepopWrapper />
                <Picker />
                <OverlayWrap />

                { liliumcms.env == "dev" ? <DevTools /> : null }
            </div>
        );
    }
}

log('Lilium', 'Lilium CMS V4, about to blow your mind in a million pieces.', 'lilium');
global.__start_lilium__ = () => {
    render(<Lilium />, document.getElementById('app'));
};
