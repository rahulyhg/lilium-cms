import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import dateformat from 'dateformat';
import { Link } from '../../routing/link';

class ContentChainListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="content-chain">
                {
                    (this.props.item.media) ? (
                        <img className='featured-image' src={this.props.item.media.sizes.square.url} alt=""/>
                    ) : (
                        <div className="content-chain-no-image">
                            <p>No Image</p>
                        </div>
                    )
                }
                <div className="content-chain-info">
                    <Link href={`/chains/edit/${this.props.item._id}`}>
                        <h1 className='chain-title font2'>{this.props.item.title}</h1>
                    </Link>
                    <h2 className='chain-subtitle font2'>{this.props.item.subtitle}</h2>
                    <h3>{`${this.props.item.articles.length} articles`}</h3>
                    <div className="content-chain-list-articles-list">
                        {
                            this.props.item.articles.map((article, index) => {
                                return (
                                    <div className="content-chain-list-article">
                                        <h4 className='content-chain-list-article-title'>{`${index + 1} - ${article.title}`}</h4>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
                <div className="content-chain-extra-info">
                    <p className="content-chain-info">{`Status: ${this.props.item.status}`}</p>
                    <p className="content-chain-info">{`Created on: ${dateformat(this.props.item.createdOn, 'mmmm dd, yyyy - HH:MM:ss')}}`}</p>
                    <p className="content-chain-info">{`Created on: ${dateformat(this.props.item.lastModifiedOn, 'mmmm dd, yyyy - HH:MM:ss')}}`}</p>
                </div>
            </div>
        );
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
                <h1>Content Chains</h1>
                <BigList listitem={ContentChainListItem} endpoint='/chains/search' toolbar={ListContentChains.TOOLBAR_CONFIG} />
            </div>
        );
    }
}
