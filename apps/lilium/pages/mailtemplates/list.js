import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { Link } from '../../routing/link';
import API from '../../data/api';
import { castNotification } from "../../layout/notifications";
import { ButtonWorker } from "../../widgets/form";

class MailTemplateListItem extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        return (
            <div className="mail-template card">
                <Link href={'/mailtemplates/edit/' + this.props.item._id}>
                    <h3 className="mail-template-title">{this.props.item.displayname}</h3>
                </Link>

                <p className="mail-template-description">{this.props.item.description}</p>
            </div>
        );
    }
}

const LoadMore = props => (
    <div className="button full-width" onClick={props.onClick}>
        <span className="text">Load more</span>
    </div>
);

export class ListMailTemplates extends Component {
    constructor(props) {
        super(props);
        this.state = { styledPages: [], loading: true };
    }

    static get TOOLBAR_CONFIG() {
        return {
            id: "mailtemplates",
            title: "Filters",
            fields: [
                { type: "text", name: "search", title: "Search by name" },
                { type: "select", name: "hook", title: "Hooks", options: [] },
            ]
        };
    }

    componentDidMount() {
        const toolbarConfig = ListMailTemplates.TOOLBAR_CONFIG;
        API.get('/mailtemplates/hooks', {}, (err, data, r) => {
            if (!err) {
                toolbarConfig.fields[1].options.push(data.map(hook => ({ value: hook.name, text: hook.displayname })));
                this.toolbarConfig = toolbarConfig;
                this.setState({ loading: false })
            } else {
                castNotification({
                    title: "Couldn't get hooks from server",
                    type: 'error'
                })
            }
        }, true);
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="mail-templates-list">
                    <h1>Styled Pages</h1>
                    <BigList listitem={MailTemplateListItem} endpoint='/mailtemplates/search' toolbar={this.toolbarConfig}
                            liststyle={{ maxWidth: '800px', margin: '0 auto' }}
                            loadmoreButton={LoadMore}  />
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            )
        }
    }
}
