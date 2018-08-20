import { h, Component } from "preact";
import { addAction } from '../../layout/lys';
import { registerOverlay } from '../../overlay/overlaywrap';

import CakepopListPage from './list';
import CakepopEditPage from './edit';

class CreateOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        return (
            <div id="create-cakepop-overlay">
                
            </div>
        );
    }
}

export default class CakepopsPage extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    static componentDidRegister() {
        log('Cakepop', 'Called register static method from URL Renderer', 'success');
        addAction({
            action : "#create",
            command : "cakepop,popup",
            displayname : "Cakepop",
            execute : () => {
                castOverlay('create-cakepop');
            }
        });

        registerOverlay('create-cakepop', CreateOverlay);
    }

    componentDidMount() {  

    }

    render() {
        switch (this.props.levels[0]) {
            case "edit" : return (<CakepopEditPage id={this.props.levels[1]} />);
            default : return (<CakepopListPage />);
        }
    }
}