import { h, Component } from "preact";
import ListView from './list';
import ThreadView from './thread';
import { navigateTo } from '../../routing/link';

export default class CommentsView extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Comments"
        }
    }

    render() {
        if (this.props.levels.length == 0) {
            return (<ListView />);
        } else if (this.props.levels[0] == "thread") {
            return (<ThreadView threadid={this.props.levels[1]} />)
        } else {
            navigateTo("/comments");
        }
    }
}
