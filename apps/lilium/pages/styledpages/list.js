import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { Link } from '../../routing/link';
import { StatusIndicator } from '../../widgets/statusindicator';

class StyledPageListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    static statusIndicatorStyle = {
        invisible: 'danger',
        public: 'success',
        magiclink: 'warning'
    }

    render() {
        return (
            <div className="styled-page">
                <Link href={'/styledpages/edit/' + this.props.item._id}>
                    <h3 className="styled-page-title">{this.props.item.title}</h3>
                </Link>
                <StatusIndicator status={this.props.item.status} style={StyledPageListItem.statusIndicatorStyle[this.props.item.status]} />
                
                <a className="styled-page-visit-link" href={`/${this.props.item.slug}`} target='_blank'>{`${document.location.protocol}${liliumcms.url}/${this.props.item.slug}`}</a>
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
                <h1>Styled Pages</h1>
                <BigList listitem={StyledPageListItem} endpoint='/styledpages/search' toolbar={ListStyledPages.TOOLBAR_CONFIG} liststyle={{ maxWidth: '800px', margin: '0 auto' }} />
            </div>
        );
    }
}
