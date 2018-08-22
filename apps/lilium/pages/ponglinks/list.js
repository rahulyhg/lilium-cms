import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { getSession } from '../../data/cache';
import { ButtonWorker } from '../../widgets/form';
import { StatusIndicator, Version } from './lib';

const styles = {
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
    fullWidthBtn: {
        display: 'block',
        margin: '10px 100px',
        textAlign:'center'
    }
}

class Ponglink extends Component {
    constructor(props) {
        super(props);

        this.state = {...this.props.item};
    }

    render() {
        return (
            <div className="ponglink" style={styles.ponglink}>
                <h2 style={styles.identifier}>{this.state.identifier}</h2>
                <StatusIndicator status={this.state.status} />
                <div className="clickCounter" style={{ display: 'inline-block', float: 'right' }}>
                    <span>{`${this.state.clicks} clicks`}</span>
                </div>
                <h3 style={styles.creatorName}>{`Created by ${getSession('mappedEntities')[this.state.creatorid].displayname}`}</h3>
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

const LoadMore = props => (
    <ButtonWorker text='Load More' sync={true} work={done => props.onClick()} style={styles.fullWidthBtn} />
);

export class PonglinksList extends Component {
    constructor(props) {
        super(props);

        this.state = {};
        this.bigListToolbar = {};
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
                <BigList listitem={Ponglink} batchsize={15} endpoint='/ponglinks/bunch' toolbar={PonglinksList.TOOLBAR_CONFIG} loadmoreButton={LoadMore} />                
            </div>
        );
    }
}
