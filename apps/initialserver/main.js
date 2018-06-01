import { h, render, Component } from 'preact';

class LiliumInitialServer extends Component {
    render() {
        return (
            <div id="lilium-initial-server">
                <p>This is a <b>Preact</b> component for Lilium initial server!</p>
            </div>
        );
    }
}

render(<LiliumInitialServer />, document.body);
