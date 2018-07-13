import { Component, h, render } from 'preact';
import { makeGlobalLogger } from './data/logger';
import { Header } from './layout/header'
import { URLRenderer } from './routing/urlrenderer';
import { initiateConnection } from './realtime/connection';

// LILIUM_IMPORT_TEMPLATE

makeGlobalLogger();
class Lilium extends Component {
    constructor(props) {
        super(props);        
        log('Lilium', 'Created Main app component', 'lilium');
    }

    componentDidMount() {
        log('Lilium', 'Main component finished mounting', 'lilium');
        initiateConnection();
    }

    render() {
        log('Lilium', 'Rendering Lilium application into DOM', 'layout');
        return (
            <div id="lilium">
                <Header />
                <URLRenderer />
            </div>
        );
    }
}

log('Lilium', 'Lilium CMS V4, about to blow your mind in a million pieces.', 'lilium');
render(<Lilium />, document.getElementById('app'));