import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import API from "../../data/api";
import { BigList, BigListToolBarBuilder } from '../../widgets/biglist';
import { castOverlay } from '../../overlay/overlaywrap';
import { ButtonWorker } from '../../widgets/form';
import { getSession } from '../../data/cache';
import { POST_STATUS } from '../../data/const'

class PostListItem extends Component {
    preview() {
        window.open(`/publishing/preview/${this.props.item._id}/${this.props.item.previewkey}`)
    }

    viewonsite() {
        window.open(`/${this.props.item.name}`);
    }

    componentWillMount() {
        this.author = getSession("entities").find(x => x._id == this.props.item.author) || {
            displayname : "Inactive user",
            avatarURL : "/static/media/lmllogo.png"
        };
    }

    render() {
        return (
            <div class="flex-row publishing-list-item">
                <div class={"flex-col article-list-image-wrapper " + ( this.props.item.thumbnail ? "" : "gray-background" )}>
                    <Link href={"/publishing/write/" + this.props.item._id} linkStyle="block">
                        { this.props.item.thumbnail ? (<img src={ this.props.item.thumbnail } />) : (null) }
                    </Link>
                </div>
                <div class="flex-col article-list-title">
                    <Link href={"/publishing/write/" + this.props.item._id} linkStyle="block">
                        {this.props.item.headline}
                    </Link>
                </div>
                <div class="flex-col article-list-status">
                    <span class={"article-list-status-" + this.props.item.status} style={{ backgroundColor : POST_STATUS[this.props.item.status].color }}>
                        { POST_STATUS[this.props.item.status].w }
                    </span>              
                </div>              
                <div class="flex-col article-list-author">
                    <img src={this.author.avatarURL} />
                    <span title={this.author.displayname}>{this.author.displayname.split(' ')[0]}</span>
                </div>
            </div>
        );
    }
}

class PostListItemAdd extends Component {
    onClick() {
        castOverlay('create-article');
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} class="flex-row publishing-list-item publishing-create-article">
                <div class="flex-col article-list-image-wrapper"><i className="fa fa-plus"></i></div>
                <div class="flex-col article-list-title">
                    <b>Create new article</b>
                </div>
            </div>
        )
    }
}

const LoadMoreArticles = props => (
    <div onClick={props.onClick && props.onClick.bind(this)} style={{ textAlign: 'center' }}>
        <ButtonWorker text='Load More' type='fill' theme='blue' sync={true} />
    </div>
)

export default class ListView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            ready : false
        }
    }

    static get pagesettings() {
        return {
            title : "Publishing - list of articles"
        };
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "publishingListTb",
            title : "Filters",
            fields : [
                { type : "text", name : "search", title : "Search by title" },
                { type : "select", name : "status", title : "Status", options : [
                    { value : "", text : "All statuses" },
                    { value : "draft", text : "Draft" },
                    { value : "published", text : "Published" },
                    { value : "reviewing", text : "Pending review" },
                    { value : "deleted", text : "Set back to draft" }
                ] }
            ]
        };
    }

    componentDidMount() {
        const users = getSession("entities");
        const toolbarconfigs = ListView.TOOLBAR_CONFIG;
        toolbarconfigs.fields.push({
            type : "select",
            name : "author",
            title : "Author",
            options : [
                { value : "", text : "Anyone" }, 
                { value : liliumcms.session._id, text : "Me" }, 
                ...users.map(u => { return { value : u._id, text : u.displayname } })
            ]
        });

        const toolbarbuilder = new BigListToolBarBuilder();
        this.setState({ toolbarConfig : toolbarbuilder.make(toolbarconfigs), ready : true })
    }

    render() {
        if (!this.state.ready) {
            return null;
        }

        return (
            <BigList listitem={PostListItem} endpoint="/publishing/biglist" loadmoreButton={LoadMoreArticles}
                    toolbar={this.state.toolbarConfig} addComponent={PostListItemAdd} />
        )
    }
}

