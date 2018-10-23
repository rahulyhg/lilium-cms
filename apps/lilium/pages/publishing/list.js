import { h, Component } from 'preact';
import { Link } from '../../routing/link';
import API from "../../data/api";
import { BigList, BigListToolBarBuilder } from '../../widgets/biglist';
import { castOverlay } from '../../overlay/overlaywrap';
import { getSession } from '../../data/cache';
import { POST_STATUS } from '../../data/const'

class PostListItem extends Component {
    preview() {
        window.open(`/publishing/preview/${this.props.item._id}/${this.props.item.previewkey}`)
    }

    viewonsite() {
        window.open(`/${this.props.item.name}`);
    }

    render() {
        return (
            <div class="card flex publishing-list-item" style={ {  } }>
                <Link href={"/publishing/write/" + this.props.item._id} linkStyle="block">  
                    <div class="image-wrapper article-list-thumbnail">
                        {
                            this.props.item.thumbnail ? (<img src={ this.props.item.thumbnail } />) : (<div class="article-list-no-image">No image</div>)
                        }
                    </div>        
                    <div class={"article-list-status article-list-status-" + this.props.item.status} style={{ backgroundColor : POST_STATUS[this.props.item.status].color }}>
                        { POST_STATUS[this.props.item.status].w }
                    </div>              
                    <div class="publishing-list-item-title">
                        {this.props.item.headline}
                    </div>
                </Link>

                <footer>
                    { this.props.item.status == "published" ? (<span onClick={this.viewonsite.bind(this)} class="clickable">View on website</span>) : null }
                    { this.props.item.status != "published" && this.props.item.previewkey ? (<span onClick={this.preview.bind(this)} class="clickable">Preview</span>) : null }
                </footer>
            </div>
        )
    }
}

class PostListItemAdd extends Component {
    onClick() {
        castOverlay('create-article');
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} class="card flex create-new-article-card">
                <div>
                    <i class="fal fa-plus"></i>
                </div>
                <div>
                    <b>Create new post</b>
                </div>
            </div>
        )
    }
}

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
            <BigList listitem={PostListItem} endpoint="/publishing/biglist" toolbar={this.state.toolbarConfig} addComponent={PostListItemAdd} />
        )
    }
}