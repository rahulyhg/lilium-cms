import { h, Component } from "preact";
import ListView from './list';
import EditView from './edit';
import { navigateTo } from '../../routing/link';

export default class PublishingTab extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Publishing"
        }
    }

    render() {
        log('Publishing', 'Rendering publishing pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels.length == 0) {
            return (<ListView session={this.props.session} />);
        } else if (this.props.levels[0] == "write") {
            return (<EditView session={this.props.session} postid={this.props.levels[1]} />)
        } else {
            navigateTo("/publishing");
        }
    }
}
