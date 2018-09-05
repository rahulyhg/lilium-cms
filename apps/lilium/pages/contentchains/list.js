import { Component, h, dangerouslySetInnerHTML } from "preact";
import { BigList } from '../../widgets/biglist';
import { ArticlePickerArticle } from '../../widgets/articlepicker';

class ContentChainListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        console.log(this.props.item);
        
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
                    <a href={`chains/edit/${this.props.item._id}`}>
                        <h1 className='chain-title font2'>{this.props.item.title}</h1>
                    </a>
                    <h2 className='chain-subtitle font2'>{this.props.item.subtitle}</h2>
                    <h3>Articles</h3>
                    <div className="content-chain-articles-list">
                        {
                            this.props.item.articles.map((article, index) => {
                                return (
                                    <div className="content-chain-article">
                                        <ArticlePickerArticle key={slugify(article.title)} index={index} lastInList={index == this.state.selectedArticles.length - 1} title={article.title} />
                                    </div>
                                )
                            })
                        }
                    </div>
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
