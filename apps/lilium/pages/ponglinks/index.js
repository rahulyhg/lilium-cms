import { Component, h } from "preact";
import { PonglinksList } from './list';
import { addAction } from '../../layout/lys'
import { castOverlay, registerOverlay } from '../../overlay/overlaywrap';
import PonglinkInsight from './insight';
import { CreatePonglink } from './create';

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
        log('PongLinks', 'Registering overlay for CreatePonglink', 'success');
        addAction({
            action : "#create",
            command : "ponglink",
            displayname : "Ponglink",
            execute : () => {
                castOverlay('create-ponglink');
            }
        });

        registerOverlay('create-ponglink', CreatePonglink, { title: 'Create a new ponglink campaign' });
    }

    render() {
        log('Ponglinks', 'Rendering ponglinks pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels[0] == 'insights') {
            return (<PonglinkInsight id={this.props.levels[1]} />);
        } else {
            return (<PonglinksList />);
        }
    }
}
