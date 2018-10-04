import { h, Component } from "preact";
import ListView from './list';
import EditView from './edit';
import { navigateTo } from '../../routing/link';

export default class Entities extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Entities"
        };
    }

    render() {
        log('Entities', 'Rendering entities pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels.length == 0) {
            return (<ListView />);
        } else if (this.props.levels[0] == "edit") {
            return (<EditView entityId={this.props.levels[1]} />)
        } else {
            navigateTo("/entities");
        }
    }
}
