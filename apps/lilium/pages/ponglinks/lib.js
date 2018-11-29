import { castNotification } from '../../layout/notifications'
import { ButtonWorker } from "../../widgets/form";
import { Component, h } from "preact";

export function Version(props) {
    return (       
        <tr>
            <td title={props.medium}>{props.medium}</td>
            <td><a href={props.redir} target='_blank'>{props.dest}</a></td>
            <td className='copy-column'><i className="fal fa-copy" onClick={copy.bind(this, `${liliumcms.url}/pong/${props.campaignhash}/${props.hash}`)}></i></td>
        </tr>
    )
};

export function copy(txt) {
    navigator.clipboard.writeText(txt);
    castNotification({
        title: 'Copied PongLink destination to clipboard',
        message: txt,
        type: 'success'
    });
};

const ActionArchive = props => (
    <ButtonWorker work={props.changeStatus.bind(this)} sync={true} text='Archive (cannot be undone)' theme='red' type='outline' />
)
const ActionPause = props => (
    <ButtonWorker work={props.changeStatus.bind(this)} sync={true} text='Pause' theme='white' type='outline' />
)
const ActionResume = props => (
    <ButtonWorker work={props.changeStatus.bind(this)} sync={true} text='Resume' theme='blue' type='fill' />
)

export class PonglinkActions extends Component {
    constructor(props) {
        super(props);

        this.state = { status: props.status || 'archived' };
    }

    componentWillReceiveProps(props) {
        this.setState({ status: props.status });
    }

    render() {
        if (this.state.status == 'active') {
            return (
                <div className="ponglink-actions">
                    <ActionPause changeStatus={this.props.changeStatus.bind(this, 'paused')} />
                    <ActionArchive changeStatus={this.props.changeStatus.bind(this, 'archived')} />
                </div>
            );
        } else if (this.state.status == 'paused') {
            return (
                <div className="ponglink-actions">
                    <ActionResume changeStatus={this.props.changeStatus.bind(this, 'active')} />
                    <ActionArchive changeStatus={this.props.changeStatus.bind(this, 'archived')} />                        
                </div>
            );
        } else {
            return (
                <div className="ponglink-actions">
                    <p id="ponglink-archived">This ponglink is archived and cannot be activated again</p>
                </div>
            );
        }
    }
}
