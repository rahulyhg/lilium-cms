import { Component, h } from "preact";
import { RolesList } from './list';
import { addAction } from '../../layout/lys';
import { navigateTo } from '../../routing/link';

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
                navigateTo('/role', { modalShown: true })
            }
        });
    }

    render() {
        log('Roles', 'Rendering roles pane with ' + this.props.levels.length + ' levels', 'detail');
        return (<RolesList modalShown={this.props.extras.modalShown} />)
    }
}
