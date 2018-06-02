import { h, render, Component } from 'preact';

class LiliumInitialServer extends Component {
    render() {
        return (
            <div id="lilium-initial-server">
                <header id="header">
                    <div id="title-wrap">
                        <span id="title">Lilium Stack</span>
                    </div>
                </header>
                <div id="masthead">
                    <div id="masthead-left">
                        <div id="masthead-text">
                            <h1>Lilium Stack</h1>
                            <h2>Installer</h2>
                            <div>
                                
                            </div>
                        </div>
                    </div>
                    <div id="masthead-right">

                    </div>
                </div>
            </div>
        );
    }
}

render(<LiliumInitialServer />, document.getElementById('app'));
