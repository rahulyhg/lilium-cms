import { h, render, Component } from 'preact';
import BigForm from './bigform';

class LiliumInitialServer extends Component {
    submit(values) {
        console.log(values);
    }

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
                            <h3>
                                This installer will walk you through the creation of a Lilium Stack.
                            </h3>
                        </div>
                    </div>
                    <div id="masthead-right">

                    </div>
                </div>

                <BigForm submit={this.submit.bind(this)} />
            </div>
        );
    }
}

render(<LiliumInitialServer />, document.getElementById('app'));
 