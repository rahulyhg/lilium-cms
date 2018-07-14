import { Component, h, render } from 'preact';
import { makeGlobalLogger } from './data/logger';
import { Header } from './layout/header'
import { LiliumMenu } from './layout/menu';
import { URLRenderer } from './routing/urlrenderer';
import { initiateConnection } from './realtime/connection';
import { initializeDevEnv } from './dev/env';
import API from './data/api';

// LILIUM_IMPORT_TEMPLATE

makeGlobalLogger();

if (liliumcms.env == "dev") {
    initializeDevEnv();
}

class Lilium extends Component {
    constructor(props) {
        super(props);        
        this.state = {
            /* session, menus */
        };
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
            { endpoint : "/adminmenus", params : {} }
        ], (resp) => {
            if (!resp["/me"] || !resp["/me"][0]) {
                this.setState({ error : "session" });
            } else {
                log('Lilium', 'Hello, ' + resp["/me"][0].displayname + '!', 'success');
                this.setState({ session : resp["/me"][0], menus : resp["/adminmenus"] });            
                initiateConnection();
            }
        });
    }

    render() {
        log('Lilium', 'Rendering Lilium application into DOM', 'layout');
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
            </div>
        );
    }
}

log('Lilium', 'Lilium CMS V4, about to blow your mind in a million pieces.', 'lilium');
render(<Lilium />, document.getElementById('app'));