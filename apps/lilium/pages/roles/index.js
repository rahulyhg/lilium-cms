import { Component, h } from "preact";
import { RolesList } from './list';

export default class Roles extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Roles"
        };
    }

    render() {
        log('Entities', 'Rendering roles pane with ' + this.props.levels.length + ' levels', 'detail');
        return (<RolesList />)
    }
}
