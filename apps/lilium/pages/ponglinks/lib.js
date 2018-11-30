import { Component, h } from "preact";
import { castNotification } from '../../layout/notifications'
import { ButtonWorker, EditableText } from "../../widgets/form";

export class VersionsList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            versions: props.versions || [],
            addVersionModalVisible: false
        };
    }

    onVersionChange(hash, name, val) {
        const versions = this.state.versions;
        const version = versions.find(x => x.hash == hash);
        if (version) {
            version[name] = val;
            this.props.onChange(versions);
        }
    }

    removeVersion(hash) {
        const versions = this.state.versions;
        const i = versions.findIndex(x => x.hash == hash);
        if (i != -1) {
            versions.splice(i, 1);
            this.props.onChange(versions);
        }
    }

    componentWillReceiveProps(props) {
        const newState = {};
        if (props.versions) {
            newState.versions = props.versions;
            this.setState(newState);
        }
    }

    render(props, state) {
        return (
            <div className="ponglink-versions-list">
                <div className="version version-header">
                    <div className="version-medium"><h4>Medium</h4></div>
                    <div className="version-destination"><h4>Destination</h4></div>
                    <div className="version-copy"><h4>Copy</h4></div>
                    <div className="version-remove"><h4>Remove</h4></div>
                </div>
                {
                    state.versions.map(version => (
                        <Version {...version} editable={!!props.editable} key={version.hash} onChange={this.onVersionChange.bind(this)}
                                onRemove={this.removeVersion.bind(this)} />
                    ))
                }
            </div>
        )
    }
}

const Version = props => {
    const questPos = props.destination.indexOf('?');
    const destination = props.destination.substring(0, questPos == -1 ? props.destination.length : questPos);
    return (
        <div className='version'>
            <div className="version-medium">
                {
                    props.editable ? (
                        <EditableText initialValue={props.medium} name='medium' onChange={props.onChange.bind(this, props.hash)} />
                    ) : (
                        <span>{props.medium}</span>
                    )
                }
            </div>
            <div className="version-destination">
                {
                    props.editable ? (
                        <EditableText initialValue={destination} name='destination' onChange={props.onChange.bind(this, props.hash)} />
                    ) : (
                        <a target='_blank' href={props.destination}>{destination}</a>
                    )
                }
            </div>
            <div className="version-copy"><i className="far fa-copy" onClick={copy.bind(this, destination)} title='Copy'></i></div>
            <div className="version-remove">
                {
                    props.editable ? (
                        <i className="fal fa-trash red" onClick={props.onRemove.bind(this, props.hash)}></i>
                    ) : null
                }
            </div>
        </div>
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

export const STATUS_TO_COLOR = {
    active : 'green',
    paused : 'orange',
    archived : 'red'
}

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
