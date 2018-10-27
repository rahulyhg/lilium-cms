import { h, Component } from "preact";
import ListView from './list';
import EditView from './edit';
import { castOverlay, registerOverlay } from '../../overlay/overlaywrap';
import { navigateTo } from '../../routing/link';
import { CreateEntity } from './createoverlay';
import { addAction } from '../../layout/lys';

export default class Entities extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Entities"
        };
    }

    static componentDidRegister() {
        log('PongLinks', 'Registering overlay for CreateEntity', 'success');
        addAction({
            action : "#create",
            command : "entity",
            displayname : "Entity",
            execute : () => {
                castOverlay('create-entity');
            }
        });

        registerOverlay('create-entity', CreateEntity, { title: 'Invite a new entity' });
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
