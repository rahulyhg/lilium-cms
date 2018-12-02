import { Component, h } from "preact";
import { BigList } from '../../widgets/biglist';
import { Link } from '../../routing/link';
import { castNotification } from "../../layout/notifications";
import { ButtonWorker } from "../../widgets/form";

import API from '../../data/api';

class MailTemplateListItem extends Component {
    constructor(props) {
        super(props);

        this.state = props.item;
        this.state.hooktext = MailTemplateListItem.hooks.find(x => x.name == props.item.hooks);
    }

    render() {
        return (
            <div class="envelope" style={{
                transform : "rotateZ(" + (Math.random() * (-2) + 1) + "deg)"
            }}>
                <div class="envelope-stamp">
                    <img src="/static/media/lmllogo.png" style={{
                        top : Math.random() * 25,
                        right: Math.random() * 30,
                        transform : "rotateZ(" + (Math.random() * (-90) + 90) + "deg)"
                    }} />
                </div>
                <div class="envelope-grunge">
                    <Link href={'/mailtemplates/edit/' + this.state._id}>
                        <img src="/static/media/grunge.jpg" />
                    </Link>
                </div>
                <div class="envelope-content">
                    <div class="envelope-top">
                        <div class="envelope-title">
                            {this.state.displayname}
                        </div>
                        <div class="envelope-subtitle">
                        {
                            this.state.hooktext ? (
                                <div>{this.state.hooktext.displayname}</div>
                            ) : null
                        }
                        </div>
                    </div>
                    <div class="envelope-center" style={{
                        transform : "rotateZ(" + (Math.random() * (-2) + 1) + "deg)"
                    }}>
                        <p>{this.state.description}</p>
                    </div>
                </div>
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
                { type: "text", name: "search", title: "Search by name" }
            ]
        };
    }

    componentDidMount() {
        API.get('/mailtemplates/hooks', {}, (err, data, r) => {
            if (!err) {
                const toolbarConfig = ListMailTemplates.TOOLBAR_CONFIG;
                toolbarConfig.fields.push({
                    type : "select",
                    name : "hook",
                    title : "Hooks",
                    options : [{
                        value : "", text : "All hooks"
                    }, ...data.map(hook => ({ value: hook.name, text: hook.displayname }))]
                });

                MailTemplateListItem.hooks = data;

                this.toolbarConfig = toolbarConfig;
                this.setState({ loading: false })
            } else {
                castNotification({
                    title : "Filter error",
                    message : "Couldn't get hooks from server",
                    type: 'error'
                })
            }
        }, true);
    }

    render() {
        if (!this.state.loading) {
            return (
                <div class="mail-templates-list">
                    <BigList listitem={MailTemplateListItem} endpoint='/mailtemplates/search' toolbar={this.toolbarConfig}
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
