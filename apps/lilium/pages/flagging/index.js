import { h, Component } from "preact";
import ListView from './list';
import SingleView from './single';
import { navigateTo } from '../../routing/link';

export default class FlaggingIndex extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Flagging"
        }
    }

    render() {
        if (this.props.levels.length == 0) {
            return (<ListView />);
        } else if (this.props.levels[0] == "single") {
            return (<SingleView flagid={this.props.levels[1]} />)
        } else {
            navigateTo("/flagging");
        }
    }
}
