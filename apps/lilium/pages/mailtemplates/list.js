import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { Link } from '../../routing/link';
import { StatusIndicator } from '../../widgets/statusindicator';

class MailTemplateListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="mail-template">
                <Link href={'/mailtemplates/edit/' + this.props.item._id}>
                    <h3 className="mail-template-title">{this.props.item.displayname}</h3>
                </Link>

                <p className="mail-template-description">{this.props.item.description}</p>
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
            id : "mailtemplates",
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
            <div id="mail-templates-list">
                <h1>Styled Pages</h1>
                <BigList listitem={MailTemplateListItem} endpoint='/mailtemplates/search' toolbar={ListStyledPages.TOOLBAR_CONFIG} liststyle={{ maxWidth: '800px', margin: '0 auto' }} />
            </div>
        );
    }
}
