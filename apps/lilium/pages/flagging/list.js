import { h, Component } from "preact";
import API from '../../data/api';
import { BigList } from '../../widgets/biglist';
import dateformat from 'dateformat';
import { castNotification } from '../../layout/notifications' 

const TYPES_TO_VOCAB = {
    article_typo : "Type in an article",
    article_inac : "Inaccuracy in an article",
    article_offensive : "Offensive article",

    comment_spam : "Spam comment",
    comment_offensive : "Offensive comment",

    other_embed : "Embed",
    technical : "Technical issue",
    instagram_removed : "Instagram picture should be removed",
    instagram_offensive : "Offensive Instagram embed",

    other : "Other"
};

const FLAGGEE_TYPE_TO_VOCAB = {
    article : { vocab : "Article",   color : "#268fff" },
    comment : { vocab : "Comment",   color : "#19ad3a" },
    tech    : { vocab : "Technical", color : "#e69922" },
    other   : { vocab : "Other",     color : "#333" },
    embed   : { vocab : "Embed",     color : "#e522e6" }
};

const FlagItemType = props => (
    <div class="flag-type">
        <div class="flag-type-bubble" style={{ backgroundColor : (FLAGGEE_TYPE_TO_VOCAB[props.flaggeetype] || FLAGGEE_TYPE_TO_VOCAB.other).color }}>
            { (FLAGGEE_TYPE_TO_VOCAB[props.flaggeetype] || FLAGGEE_TYPE_TO_VOCAB.other).vocab } 
        </div>
        <div class="flag-type-text" style={{ color : (FLAGGEE_TYPE_TO_VOCAB[props.flaggeetype] || FLAGGEE_TYPE_TO_VOCAB.other).color }}>
            { TYPES_TO_VOCAB[props.type] || TYPES_TO_VOCAB.other }
        </div>
    </div>
);

class FlagListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            item : props.item
        };
    }

    unpublished() {
        API.delete('/publishing/unpublish/' + this.state.item.article._id, {}, () => {
            const article = this.state.item.article;
            article.status = "deleted";

            this.setState({ article });
            castNotification({
                type : "success",
                title : "Article unpublished",
                message : "The article " + this.state.item.article.title + " was unpublished"
            })
        });
    }

    render() {
        return (
            <div class="flag-list-item">
                <div>
                    <FlagItemType flaggeetype={this.state.item.flaggeetype} type={this.state.item.type} />
                </div>
                <div class="flag-list-poster">
                    <img src={this.state.item.poster.picture} />
                    <span>{this.state.item.poster.displayname}</span>
                    <span>{dateformat(this.state.item.at, "HH:MM, dd mmmm yyyy")}</span>
                </div>
                <div class="flag-list-message">
                    {this.state.item.message}
                </div>
                {
                    this.state.item.article ? (
                        <div class="flag-list-details">
                            <div>Article : <a target="_blank" href={this.state.item.from}>{this.state.item.article.title}</a></div>
                            <div>Currently Live : <b>{this.state.item.article.status == "published" ? "Yes" : "No"}</b></div>
                            <div>Published On : <b>{dateformat(new Date(this.state.item.article.date), "dd mmmm yy, HH:MM")}</b></div>
                            <div>Sponsored : <b>{this.state.item.article.isSponsored ? "Yes" : "No"}</b></div>
                            <div>Marked as NSFW : <b>{this.state.item.article.nsfw ? "Yes" : "No"}</b></div>
                        </div>
                    ) : null
                }
                <div class="flag-list-actions">
                    <div class="flag-list-single-action">Close flag</div>
                    { this.state.item.article && this.state.item.article.status == "published" ? (<div class="flag-list-single-action red" onClick={this.unpublished.bind(this)}>Unpublish article</div> ) : null }
                    <div class="flag-list-single-action red">Ban user</div>
                </div>
            </div>
        )
    }
}

export default class ListView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        };
    }
    
    componentDidMount() {
        
    }
    
    render() {
        return (
            <div style={{ maxWidth : 720, margin: "20px auto" }}>
                <h1>Flagging</h1>
                <div>
                    <BigList endpoint="/flagging/bunch" listitem={FlagListItem} batchsize={50} />
                </div>
            </div>
        );
    }
}