import { Component, h, render } from 'preact';
import { Header } from './layout/header'

class Lilium extends Component {
    render() {
        return (
            <div id="lilium">
                <Header />
                
            </div>
        );
    }
}

render(<Lilium />, document.getElementById('app'));