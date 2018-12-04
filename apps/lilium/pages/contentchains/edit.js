import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from '../../layout/notifications'
import { TextField, ButtonWorker } from "../../widgets/form";
import { TextEditor } from '../../widgets/texteditor';
import { ArticlePicker } from "../../widgets/articlepicker";
import { Picker } from "../../layout/picker";

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
                this.setState({ chain: { ...data }, loading: false });
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

    chooseFeaturedImage() {
        Picker.cast(new Picker.Session({}), selected => {
            console.log('image picked: ', selected);
            const chain = this.state.chain;
            chain.media = selected.upload;
            this.setState({ chain });
            API.post('/chains/edit/' + this.state.chain._id, { media: selected.upload._id }, (err, data, r) => {
                if (r.status == 200) {
                    castNotification({
                        title: 'New Featured image saved',
                        type: 'success'
                    })
                } else {
                    castNotification({
                        title: 'Error while saving content chain data on the server',
                        type: 'error'
                    });
                }
            });
        });
    }

    togglePublishState(done) {
        const action = this.state.chain.status == 'draft' ? 'live' : 'unpublish';
        API.post(`/chains/${action}/${this.state.chain._id}`, {}, (err, data, r) => {
            if (r.status == 200) {
                const chain = this.state.chain;
                chain.status = this.state.chain.status == 'draft' ? 'live' : 'draft';
                this.setState({ chain }, () => {
                    castNotification({
                        title: `The content chain was ${(this.state.chain.status == 'draft') ? 'unpublished' : 'published'}`,
                        type: 'success'
                    })
                });

                done();
            } else {
                castNotification({
                    title: 'Error while saving content chain data on the server',
                    type: 'error'
                });

                done();
            }
        });
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="content-chain-edit">
                    <h1>Edit Content Chain</h1>
                    <TextField name='title' placeholder='title' initialValue={this.state.chain.title} onChange={this.updateValues.bind(this)} />
                    <TextField name='subtitle' placeholder='subtitle' initialValue={this.state.chain.subtitle} onChange={this.updateValues.bind(this)} />
                    <TextEditor name='presentation' placeholder='presentation' content={this.state.chain.presentation} onChange={this.updateValues.bind(this)} />

                    <h4>Featured Image</h4>
                    <div className="content-chain-featured-image-picker" onClick={this.chooseFeaturedImage.bind(this)} title='Choose a featured image'>
                        {
                            (this.state.chain.media) ? (
                                <img className='featured-image' src={this.state.chain.media.sizes.content.url} alt="Content chain featured image" />
                            ) : (
                                <p id="choose-features-image">Choose a featured image</p>
                            )
                        }
                    </div>

                    <h4>Select articles for the content chain</h4>
                    <ArticlePicker onChange={this.selectedArticlesChanged.bind(this)} initialValue={this.state.chain.articles} />
                    <hr />
                    {
                        this.state.chain.status == 'draft' ? (
                            <ButtonWorker text='Publish' theme='purple' type='fill' work={this.togglePublishState.bind(this)}  />
                        ) : (
                            <ButtonWorker text='Unpublish' theme='red' type='outline' work={this.togglePublishState.bind(this)}  />
                        )
                    }
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            );
        }
    }
}
