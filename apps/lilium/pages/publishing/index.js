import { h, Component } from "preact";
import ListView from './list';
import EditView from './edit';
import { navigateTo } from '../../routing/link';
import { addAction } from '../../layout/lys'
import { registerOverlay, castOverlay } from '../../overlay/overlaywrap';
import { CreateOverlay } from './createoverlay';

export default class PublishingTab extends Component {
    constructor(props) {
        super(props);
    }

    static get pagesettings()  {
        return {
            title : "Publishing"
        }
    }

    static componentDidRegister() {
        log('Publishing', 'Called register static method from URL Renderer', 'success');
        addAction({
            action : "#create",
            command : "article,post",
            displayname : "Article",
            execute : () => {
                castOverlay('create-article');
            }
        });

        registerOverlay('create-article', CreateOverlay);
    }

    render() {
        log('Publishing', 'Rendering publishing pane with ' + this.props.levels.length + ' levels', 'detail');
        if (this.props.levels.length == 0) {
            return (<ListView session={this.props.session} />);
        } else if (this.props.levels[0] == "write") {
            return (<EditView session={this.props.session} postid={this.props.levels[1]} />)
        } else {
            navigateTo("/publishing");
        }
    }
}
