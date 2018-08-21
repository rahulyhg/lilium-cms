import { Component, h } from "preact";
import { RolesList } from './list';
import { addAction } from '../../layout/lys'
import { castOverlay } from '../../overlay/overlaywrap';

export default class Roles extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Roles"
        };
    }

    static componentDidRegister() {
        addAction({
            action : "#create",
            command : "role",
            displayname : "Role",
            execute : () => {
                castOverlay('create-role');
            }
        });
    }

    render() {
        log('Roles', 'Rendering roles pane with ' + this.props.levels.length + ' levels', 'detail');
        return (<RolesList />)
    }
}
