import { castNotification } from '../../layout/notifications'
import { Component, h } from "preact";

const styles = {
    copyColumn: {
        textAlign: 'center',
        width: '80px'
    },
    copyIcon: {
        cursor: 'pointer'
    },
    actions: {
        display: 'flex',
    },
    ponglinkAction: {
        textAlign: 'center',
        flexGrow: '1'
    },
    actionText: {
        cursor: 'pointer'
    },
    archivedMessage: {
        color: 'red',
        margin: '6px',
        textAlign: 'center'
    }
}

export function Version(props) {
    console.log(props);
    
    return (       
        <tr>
            <td title={props.medium}>{props.medium}</td>
            <td><a href={props.dest} target='_blank'>{props.dest}</a></td>
            <td style={styles.copyColumn}><i className="fal fa-copy" onClick={copy.bind(this, props.dest)} style={styles.copyIcon}></i></td>
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
    <span style={styles.actionText} onClick={props.changeStatus}>Archive (this action is irreversible)</span>
)
const ActionPause = props => (
    <span style={styles.actionText} onClick={props.changeStatus}>Pause)</span>
)
const ActionResume = props => (
    <span style={styles.actionText} onClick={props.changeStatus}>Resume</span>
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
                <div className="ponglink-actions" style={styles.actions}>
                    <div className="ponglink-action warning" style={{...styles.ponglinkAction, color: 'yellow'}}>
                        <ActionPause changeStatus={this.props.changeStatus.bind(this, 'paused')} />
                    </div>
                    <div className="ponglink-action danger" style={{...styles.ponglinkAction, color: 'red'}}>
                        <ActionArchive changeStatus={this.props.changeStatus.bind(this, 'archived')} />
                    </div>
                </div>
            );
        } else if (this.state.status == 'paused') {
            return (
                <div className="ponglink-actions" style={styles.actions}>
                    <div className="ponglink-action success" style={{...styles.ponglinkAction, color: 'green'}}>
                        <ActionResume changeStatus={this.props.changeStatus.bind(this, 'active')} />
                    </div>
                    <div className="ponglink-action danger" style={{...styles.ponglinkAction, color: 'red'}}>
                        <ActionArchive changeStatus={this.props.changeStatus.bind(this, 'archived')} />                        
                    </div>
                </div>
            );
        } else {
            return (
                <div className="ponglink-actions">
                    <p className="ponglink-archived" style={styles.archivedMessage}>This campaign is archived and cannot be activated again</p>
                </div>
            );
        }
    }
}
