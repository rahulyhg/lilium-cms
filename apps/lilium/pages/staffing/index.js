import { h, Component } from 'preact'
import ListView from './list';
import SingleView from './single';

export default class StaffingPage extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        if (this.props.levels.length == 0) {
            return ( <div><ListView session={this.props.session} /></div> );
        } else if (this.props.levels[0] == "single") {
            return ( <div><SingleView staffid={this.props.levels[1]} session={this.props.session} /></div> );
        } else {
            return null;
        }
    }
};
