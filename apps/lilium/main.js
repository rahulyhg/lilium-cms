import { Component, h, render } from 'preact';
import { Header } from './layout/header'
import { URLRenderer } from './routing/urlrenderer';

// LILIUM_IMPORT_TEMPLATE

class Lilium extends Component {
    render() {
        return (
            <div id="lilium">
                <Header />
                <URLRenderer />
            </div>
        );
    }
}

render(<Lilium />, document.getElementById('app'));