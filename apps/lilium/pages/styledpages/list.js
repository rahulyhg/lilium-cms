import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { Link } from '../../routing/link';
import { StatusIndicator } from '../../widgets/statusindicator';
import { castOverlay } from '../../overlay/overlaywrap';

const STATUS_TO_COLOR = {
    invisible : "",
    public : "green",
    magiclink : "orange"
}

class StyledPageListItemAdd extends Component {
    onClick() {
        castOverlay('create-styledpage');
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} class="card create-new-styledpage-card">
                <div>
                    <i class="fal fa-plus"></i>
                    <b>Create Styled Page</b>
                </div>
            </div>
        )
    }
}

class StyledPageListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="card">
                <Link display="block" href={'/styledpages/edit/' + this.props.item._id}>
                    <div class="detail-head">
                        <div class="bubble-wrap">
                            <div class="styled-page-title">{this.props.item.title}</div>
                            
                            <div class={"bubble " + STATUS_TO_COLOR[this.props.item.status]}>
                                {this.props.item.status}
                            </div>
                            {
                                this.props.item.staticfile ? (
                                    <div class="bubble blue">
                                        Static File
                                    </div>
                                ) : null
                            }
                        </div>
                    </div>
                </Link>

                <p>{this.props.item.description || "No description"}</p>

                <div class="detail-list">
                    <div>Access key : <b>{this.props.item.magiclink}</b></div>
                    <div>Uses layout : <b>{this.props.item.skiplayout ? "No" : "Yes"}</b></div>
                    <div>Served as static file : <b>{this.props.item.staticfile ? "Yes" : "No"}</b></div>
                    <div>URL slug : <b>{this.props.item.slug}</b></div>
                </div>

                <footer>
                    <span>
                        <Link href={'/styledpages/edit/' + this.props.item._id}>Edit</Link>
                    </span>
                    {
                        this.props.item.status != "invisible" ? (
                            <span>
                                <a className="styled-page-visit-link" href={`/${this.props.item.slug}` + (this.props.item.status == "magiclink" ? (`?accesskey=${this.props.item.magiclink}`) : "")} target='_blank'>
                                    Open page in new tab
                                </a>
                            </span>
                        ) : null
                    }
                </footer>
            </div>
        );
    }
}

export class ListStyledPages extends Component {
    constructor(props) {
        super(props);
        this.state = { styledPages: [] };
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "styledpages",
            title : "Filters",
            fields : [
                { type: "text", name: "search", title: "Search by keywords" },
                { type: "select", name: "status", title: "Visibility", options: [
                    { value: "", text: "All" },
                    { value: "public", text: "Public" },
                    { value: "magiclink", text: "Magic Link" },
                    { value: "invisible", text: "Invisible" }
                ] },
            ]
        };
    }

    render() {
        return (
            <div id="styled-pages-list">
                <BigList listitem={StyledPageListItem} addComponent={StyledPageListItemAdd} endpoint='/styledpages/search' toolbar={ListStyledPages.TOOLBAR_CONFIG} liststyle={{ maxWidth: '800px', margin: '0 auto' }} />
            </div>
        );
    }
}
