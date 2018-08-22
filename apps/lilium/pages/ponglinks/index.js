import { Component, h } from "preact";
import { PonglinksList } from './list';
import { addAction } from '../../layout/lys'
import { castOverlay, registerOverlay } from '../../overlay/overlaywrap';
import Modal from '../../widgets/modal';
import PonglinkInsight from './insight';

class CreatePongLinkForm extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <h1>TUTE</h1>
        )
    }
}

class CreatePongLinkOverlay extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Modal title='Create a new ponglink' visible={true} style={{zIndex: '2000'}}>
                <CreatePongLinkForm />
            </Modal>
        )
    }
}

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

        registerOverlay('create-ponglink', CreatePongLinkOverlay)
    }

    render() {
        log('Ponglinks', 'Rendering ponglinks pane with ' + this.props.levels.length + ' levels', 'detail');
        console.log('levels', this.props.levels);
        if (this.props.levels[0] == 'insights') {
            return (<PonglinkInsight id={this.props.levels[1]} />);
        } else {
            return (<PonglinksList />);
        }
    }
}
