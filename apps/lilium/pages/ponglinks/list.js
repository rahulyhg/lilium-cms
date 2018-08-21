import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { getSession } from '../../data/cache';
import { castNotification } from '../../layout/notifications';

const STATUS_COLORS = {
    active: '#6da55e',
    paused: '#735a1f',
    archived: '#731f1f'
};

const styles = {
    statusIndicator: {
        color: 'white',
        display: 'inline-block',
        padding: '4px',
        borderRadius: '4px'
    },
    ponglink: {
        width: '100%',
        backgroundColor: 'white',
        margin: '8px 0px',
        padding: '16px',
        boxShadow: '0px 2px 0px rgba(0, 0, 0, 0.2)'
    },
    creatorName: {
        fontWeight: '100',
        margin: '0'
    },
    identifier: {
        display: 'inline-block',
        marginRight: '14px',
        marginBottom: '0'
    },
    versions: {
        width: '100%',
        borderCollapse: 'collapse',
        border: '0'
    },
    mediumHeader: {
        width: '120px'
    },
    copyColumn: {
        textAlign: 'center',
        width: '80px'
    },
    copyIcon: {
        cursor: 'pointer'
    }
}

const StatusIndicator = props => (
    <div className="status-indicator" style={Object.assign({}, styles.statusIndicator, { backgroundColor: STATUS_COLORS[props.status] })}>
        <span>{props.status.toUpperCase()}</span>
    </div>
);

const copy = txt => {
    navigator.clipboard.writeText(txt);
    castNotification({
        title: 'Copied PongLink destination to clipboard',
        message: txt,
        type: 'success'
    });
};

const Version = props => (
    <tr style={styles.versionRow}>
        <td title={props.medium}>{props.medium}</td>
        <td><a href={props.dest} target='_blank'>{props.dest}</a></td>
        <td style={styles.copyColumn}><i className="fal fa-copy" onClick={copy.bind(this, props.dest)} style={styles.copyIcon}></i></td>
    </tr>
)

class PonglinkListItem extends Component {
    constructor(props) {
        super(props);

        this.state = {...this.props.item};
        console.log(this.state);
    }

    render() {
        return (
            <div className="ponglink" style={styles.ponglink}>
                <h2 style={styles.identifier}>{this.state.identifier}</h2>
                <StatusIndicator status={this.state.status} />
                <div className="clickCounter" style={{ display: 'inline-block', float: 'right' }}>
                    <span>{`${this.state.clicks} clicks`}</span>
                </div>
                <h3 style={styles.creatorName}>{`Created by ${mappedUsers[this.state.creatorid].displayname}`}</h3>
                <hr />
                <table id="versions" style={styles.versions}>
                    <thead>
                        <tr>
                            <th align='left' className='medium-header' style={styles.mediumHeader}>Medium</th>
                            <th align='left'>Destination</th>
                            <th style={{maxWidth: '80px'}}>Copy</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            this.state.versions.map(version => {
                                return (
                                    <Version medium={version.medium} dest={`https://www.narcity.com/pong/${this.state.hash}/${version.hash}`} />
                                );
                            })
                        }
                    </tbody>
                </table>
            </div>
        );
    }
}

// Object containing all active users keyed by id, returned from cache
let mappedUsers;

export class PonglinksList extends Component {
    constructor(props) {
        super(props);

        this.state = {};
        this.bigListToolbar = {

        };

        mappedUsers = {};
        getSession('entities').forEach(entity => {
            mappedUsers[entity._id] = entity;
        });
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "ponglinks",
            title : "Filters",
            fields : [
                { type : "text", name : "search", title : "Search by title keywords" },
                { type : "select", name : "status", title : "Status", options : [
                    { value : "active", text : "Active" },
                    { value : "revoked", text : "Paused" },
                    { value : "archived", text : "Archived" },
                    { value : "", text : "All statuses" },
                ] }
            ]
        };
    }

    componentWillUnmount() {
        mappedUsers = undefined;
    }

    render() {
        return (
            <div id="ponglinks-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <BigList listitem={PonglinkListItem} endpoint='/ponglinks/bunch' toolbar={PonglinksList.TOOLBAR_CONFIG} />                
            </div>
        );
    }
}
