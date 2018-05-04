import { h, render, Component } from 'preact';

class App extends Component {
    constructor() {
        super();
    }

    render() {
        return (
            <div id="app">Hello!</div>
        );
    }
}

render(<App />, document.getElementById("root"));
