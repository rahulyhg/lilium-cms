import { h, Component } from 'preact'
import ListView from './list';

export default class StaffingPage extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <ListView session={this.props.session} />
            </div>
        );
    }
};
