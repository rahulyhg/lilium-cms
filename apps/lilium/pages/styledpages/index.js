import { Component, h } from 'preact';
import { CreateStyledPage } from './create';
import { ListStyledPages } from './list';
import { EditStyledPage } from './edit';
import { addAction } from '../../layout/lys'
import { castOverlay, registerOverlay } from '../../overlay/overlaywrap';

export default class StyledPages extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings() {
        return {
            title : 'StyledPages'
        };
    }

    static componentDidRegister() {
        log('StyledPages', 'Registering overlay for CreateStyledPages', 'success');
        addAction({
            action : '#create',
            command : 'styledpage,static',
            displayname : 'Styled Page',
            execute : () => {
                castOverlay('create-styledpage');
            }
        });

        registerOverlay('create-styledpage', CreateStyledPage, { title: 'Create a new styled page' });
    }

    render() {
        log('StyledPages', 'Rendering styled page pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels[0] == 'edit') {
            return (<EditStyledPage id={this.props.levels[1]} styledPage={this.props.extras._id ? {...this.props.extras} : undefined} />);
        } else {
            return (<ListStyledPages />);
        }
    }
}
