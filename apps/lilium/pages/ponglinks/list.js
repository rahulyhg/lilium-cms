import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { getSession } from '../../data/cache';


const STATUS_COLORS = {
    active: '#6da55e',
    paused: '#735a1f',
    archived: '#731f1f'
};

const styles = {
    statusIndicator: {
        color: 'white',
        display: 'inline-block',
        padding: '4px'
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
    }
}

const StatusIndicator = props => (
    <div className="status-indicator" style={Object.assign({}, styles.statusIndicator, { backgroundColor: STATUS_COLORS[props.status] })}>
        <span>{props.status.toUpperCase()}</span>
    </div>
);

class PonglinkVersion extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="version">

            </div>
        );
    }
}

class Version extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="version">
            
            </div>
        );
    }
}

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
                <h3 style={styles.creatorName}>{mappedUsers[this.state.creatorid].displayname}</h3>
                <hr />
                {
                    this.state.versions.map(version => {
                        return (
                            <Version />
                        );
                    })
                }
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
