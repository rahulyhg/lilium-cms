import { h, render, Component } from 'preact';

class AppDevtools extends Component {
    render() {
        return (
            <div id="appdevtools-component">
                <p>This is a <b>Preact</b> component! 😍 </p>
                <p>And your name is <b>{liliumcms.session.current.displayname}</b>.</p>
            </div>
        );
    }
}

render(<AppDevtools />, document.getElementById("devtools-app"));
