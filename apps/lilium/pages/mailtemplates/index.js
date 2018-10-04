import { Component, h } from 'preact';
import { CreateMailTemplate } from './create';
import { ListMailTemplates } from './list';
import { EditMailTemplate } from './edit';
import { addAction } from '../../layout/lys'
import { castOverlay, registerOverlay } from '../../overlay/overlaywrap';

export default class MailTemplates extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings() {
        return {
            title : 'MailTemplates'
        };
    }

    static componentDidRegister() {
        log('MailTemplates', 'Registering overlay for CreateMailTemplates', 'success');
        addAction({
            action : '#create',
            command : 'email,mail,template',
            displayname : 'Mail Template',
            execute : () => {
                castOverlay('create-mailtemplate');
            }
        });

        registerOverlay('create-mailtemplate', CreateMailTemplate, { title: 'Create a new mail template' });
    }

    render() {
        log('MailTemplates', 'Rendering mail templates pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels[0] == 'edit') {
            return (<EditMailTemplate id={this.props.levels[1]} chain={this.props.extras._id ? {...this.props.extras} : undefined} />);
        } else {
            return (<ListMailTemplates />);
        }
    }
}
