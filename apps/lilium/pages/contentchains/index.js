import { Component, h } from 'preact';
import { CreateContentChain } from './create';
import { ListContentChains } from './list';
import { EditContentChain } from './edit';
import { addAction } from '../../layout/lys'
import { castOverlay, registerOverlay } from '../../overlay/overlaywrap';

export default class ContentChains extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings() {
        return {
            title : 'ContentChains'
        };
    }

    static componentDidRegister() {
        log('ContentChains', 'Registering overlay for CreateContentChains', 'success');
        addAction({
            action : '#create',
            command : 'cc,chain,series,content',
            displayname : 'Content Chain',
            execute : () => {
                castOverlay('create-cc');
            }
        });

        registerOverlay('create-cc', CreateContentChain, { title: 'Create a new content chain' });
    }

    render() {
        log('ContentChains', 'Rendering content chains pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels[0] == 'edit') {
            return (<EditContentChain id={this.props.levels[1]} chain={this.props.extras} />);
        } else {
            return (<ListContentChains />);
        }
    }
}
