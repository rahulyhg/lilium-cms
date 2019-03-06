import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import dateformat from 'dateformat';
import { Link } from '../../routing/link';
import { castOverlay } from '../../overlay/overlaywrap';
import { ButtonWorker } from '../../widgets/form';

class ContentChainListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    
    render() {
        return (
            <div class="card flex content-chain-list-item">
                <div class="image-wrapper">
                    <Link display="block" href={`/chains/edit/${this.props.item._id}`}>
                    {
                        (this.props.item.media) ? (
                            <img src={this.props.item.media.sizes.square.url} alt=""/>
                        ) : (
                            <div className="no-image">
                                <span>No Featured Image</span>
                            </div>
                        )
                    }
                    </Link>
                </div>
                <div class="detail-head">
                    <Link display="block" href={`/chains/edit/${this.props.item._id}`}>
                        <b class="title">{this.props.item.title}</b>
                    </Link>
                    <h2 className='subtitle'>{this.props.item.subtitle}</h2>
                </div>
                <div className="detail-list">
                    <div>Articles : {this.props.item.articles.length}</div>
                    <div>Status : <b>{this.props.item.status}</b></div>
                    <div>Created On : <b>{dateformat(this.props.item.createdOn, 'mmmm dd, yyyy - HH:MM:ss')}</b></div>
                    <div>Last Modified On : <b>{dateformat(this.props.item.lastModifiedOn, 'mmmm dd, yyyy - HH:MM:ss')}</b></div>
                </div>
            </div>
        );
    }
}

class ContentChainListItemAdd extends Component {
    onClick() {
        castOverlay('create-cc');
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} class="card flex create-new-chain-card">
                <div>
                    <i class="fal fa-plus"></i>
                </div>
                <div>
                    <b>Create new chain</b>
                </div>
            </div>
        )
    }
}

export class ListContentChains extends Component {
    constructor(props) {
        super(props);
        this.state = { contentChains: [] };
    }
    
    static get TOOLBAR_CONFIG() {
        return {
            id : "contentchains",
            title : "Filters",
            fields : [
                { type : "text", name : "search", title : "Search by title" },
                { type : "select", name : "status", title : "Status", options : [
                    { value : "live", text : "Live" },
                    { value : "draft", text : "Draft" },
                    { value : "", text : "All" },
                ] },
            ]
        };
    }

    render() {
        return (
            <div id="content-chains-list">
                <BigList listitem={ContentChainListItem} addComponent={ContentChainListItemAdd}
                        endpoint='/chains/search' toolbar={ListContentChains.TOOLBAR_CONFIG} />
            </div>
        );
    }
}
