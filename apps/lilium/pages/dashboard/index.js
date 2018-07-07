import { h, Component } from "preact";

export default class Dashboard extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="dashboard">
                {this.props.levels.join(', ')}
            </div>
        );
    }
}