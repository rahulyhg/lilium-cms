import { Component, h } from "preact";
import { PonglinksList } from './list';
import { addAction } from '../../layout/lys'
import { castOverlay } from '../../overlay/overlaywrap';

export default class Ponglinks extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Ponglinks"
        };
    }

    static componentDidRegister() {
        log('Role', 'Registering overlay for CreateRole', 'success');
        addAction({
            action : "#create",
            command : "ponglink",
            displayname : "Ponglink",
            execute : () => {
                castOverlay('create-ponglink');
            }
        });
    }

    render() {
        log('Ponglinks', 'Rendering ponglinks pane with ' + this.props.levels.length + ' levels', 'detail');
        return (<PonglinksList />)
    }
}
