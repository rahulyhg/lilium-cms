import { h, Component } from 'preact';

export default class Total extends Component {
    render() {
        return (
            <div id="total-rt">
                {this.props.total}
            </div>
        );
    }
}
