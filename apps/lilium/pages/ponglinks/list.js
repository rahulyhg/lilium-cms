import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { getSession } from '../../data/cache';
import { ButtonWorker } from '../../widgets/form';
import { Version } from './lib';
import { Link } from '../../routing/link';

const styles = {
    creatorName: {
        fontWeight: '100',
        margin: '0'
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

const STATUS_TO_COLOR = {
    active : 'green',
    paused : 'orange',
    archived : ''
}

class Ponglink extends Component {
    constructor(props) {
        super(props);

        this.state = {...this.props.item};
    }

    render() {
        return (
            <div class="card">
                <div class="detail-head">
                    <div class="bubble-wrap">
                        <Link href={"/ponglinks/insights/" + this.props.item._id}>
                            <b class="big">{this.state.identifier}</b>
                        </Link>

                        <div class={"bubble " + STATUS_TO_COLOR[this.state.status]}>
                            {this.state.status}
                        </div>

                        <div class="right">
                            <span>{this.state.clicks} <i class="far fa-share"></i></span>
                        </div>
                    </div>
                    
                    <div>Created by {getSession('mappedEntities')[this.state.creatorid].displayname}</div>
                </div>


                <table>
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

    }

    render() {
        return (
            <div id="ponglinks-list">
                <BigList listitem={Ponglink} batchsize={15} endpoint='/ponglinks/bunch' liststyle={{ maxWidth: 800, margin: 'auto' }} toolbar={PonglinksList.TOOLBAR_CONFIG} loadmoreButton={LoadMore} />                
            </div>
        );
    }
}
