import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from '../../layout/notifications'
import { TextField } from "../../widgets/form";
import { TextEditor } from '../../widgets/texteditor';
import { ArticlePicker } from "../../widgets/articlepicker";

export class EditContentChain extends Component {
    constructor(props) {
        super(props);
        this.state.chain = this.props.chain || {};
        this.state.loading = !this.state.chain._id;
    }

    componentDidMount() {
        if (!this.state.chain._id) {
            this.loadFromServer(this.props.id);
        }
    }

    componentWillReceiveProps(newProps) {
        if (newProps.chain._id != this.state.chain._id) {
            this.loadFromServer(newProps.id);
        }
    }

    loadFromServer(id) {
        // If no chain was passed as an extra, make the request
        API.get(`/chains/${this.props.id}`, {}, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ chain: {...data}, loading: false });
            } else {
                castNotification({
                    title: 'Error while fetching content chain data from the server',
                    type: 'error'
                });
            }
        });
    }

    selectedArticlesChanged(articles) {
        API.post('/chains/updateArticles/' + this.state.chain._id, articles.map(article => article._id), (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    title: 'Modifications saved',
                    message: 'Your modifications to the content chain were saved',
                    type: 'success'
                })
            } else {
                castNotification({
                    title: 'Error while saving content chain data on the server',
                    type: 'error'
                });
            }
        });
    }

    updateValues(name, val) {
        this.state.chain[name] = val;

        const payload = {};
        payload[name] = val;
        API.post('/chains/edit/' + this.state.chain._id, payload, (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    title: 'Modifications saved',
                    message: 'Your modifications to the content chain were saved',
                    type: 'success'
                })
            } else {
                castNotification({
                    title: 'Error while saving content chain data on the server',
                    type: 'error'
                });
            }
        });
    }

    render() {
        console.log(this.state);;
        
        if (!this.state.loading) {
            return (
                <div id="content-chains-edit">
                    <h1>Edit Content Chain</h1>
                    <TextField name='title' placeholder='title' initialValue={this.state.chain.title} onChange={this.updateValues.bind(this)} />
                    <TextField name='subtitle' placeholder='subtitle' initialValue={this.state.chain.subtitle} onChange={this.updateValues.bind(this)} />
                    <TextEditor name='presentation' placeholder='presentation' content={this.state.chain.presentation} onChange={this.updateValues.bind(this)} />

                    <ArticlePicker onChange={this.selectedArticlesChanged.bind(this)} initialValue={this.state.chain.articles} />
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            );
        }
    }
}
