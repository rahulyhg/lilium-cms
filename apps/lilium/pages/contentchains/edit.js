import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from '../../layout/notifications';
import { TextField, ButtonWorker, SelectField } from "../../widgets/form";
import { EditionPicker } from '../../widgets/editionpicker';
import { TextEditor } from '../../widgets/texteditor';
import { ArticlePicker } from "../../widgets/articlepicker";
import { Spinner } from '../../layout/loading';
import { Picker } from "../../layout/picker";
import { getTimeAgo } from '../../widgets/timeago';

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
        const chain = {...this.state.chain}
        chain[name] = val;

        const payload = {};
        payload[name] = val;
        API.post('/chains/edit/' + chain._id, payload, (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    title: 'Modifications saved',
                    message: 'Your modifications to the content chain were saved',
                    type: 'success'
                });

                this.setState({ chain });
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
        const chain = this.state.chain;
        console.log(chain);
        
        if (action == 'live' &&
            (!chain.articles || !chain.articles.length ||
            !chain.editions || !chain.editions.length ||
            !chain.title || !chain.media))
        {
            castNotification({
                title: 'Some fields are missing to publish the content chain',
                message: 'Make sure you have added a title, a featured image, an edition and at least one article to your chain before publishing',
                type: 'error'
            });
            return done && done();
        }

        API.post(`/chains/${action}/${chain._id}`, {}, (err, data, r) => {
            if (r.status == 200) {
                chain.status = this.state.chain.status == 'draft' ? 'live' : 'draft';
                this.setState({ chain }, () => {
                    castNotification({
                        title: `The content chain was ${(this.state.chain.status == 'draft') ? 'unpublished' : 'published'}`,
                        type: 'success'
                    });
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
                    <TextField name='title' placeholder='Headline' initialValue={this.state.chain.title} onChange={this.updateValues.bind(this)} />
                    <TextField name='subtitle' placeholder='Subtitle' initialValue={this.state.chain.subtitle} onChange={this.updateValues.bind(this)} />
                    <TextEditor name='presentation' placeholder='Presentation' content={this.state.chain.presentation} onChange={this.updateValues.bind(this)} />

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

                    <div class="card publishing-card">
                        <SelectField name="language" placeholder="Language" initialValue={this.state.chain.language || "en"} value={this.state.chain.language || "en"} onChange={this.updateValues.bind(this)} options={[
                            { text : "English", value : "en" },
                            { text : "Français", value : "fr" }
                        ]} />
                        <SelectField name="culture" placeholder="Culture" initialValue={this.state.chain.culture || "ca"} value={this.state.chain.culture || "ca"} onChange={this.updateValues.bind(this)} options={[
                            { text : "Canada", value : "ca" },
                            { text : "United-States", value : "us" }
                        ]} />
                    </div>

                    <h4>Select articles for the content chain</h4>
                    <ArticlePicker onChange={this.selectedArticlesChanged.bind(this)} initialValue={this.state.chain.articles} />

                    <h4>Select an edition for this series</h4>
                    <div class="card publishing-card nopad">
                        <EditionPicker onChange={this.updateValues.bind(this)} initialValue={this.state.chain.editions || []} value={this.state.chain.editions} language={this.state.chain.language || "en"} name="editions" />
                    </div>

                    <div class="publication-details-card card">
                        <div class="detail-head">
                            <b>About this Content Chain</b>
                        </div>

                        <div class="detail-list">
                            <div>
                                Created: <b>{getTimeAgo(Date.now() - new Date(this.state.chain.createdOn).getTime()).toString()}</b>
                                 {/* by <b>{this.cachedUsers[this.state.chain.createdBy] ? this.cachedUsers[this.state.chain.createdBy].displayname : " an inactive user"}</b>. */}
                            </div>
                            { this.state.chain.lastModified ? (
                                <div>
                                    Updated: <b>{getTimeAgo(Date.now() - new Date(this.state.chain.lastModified).getTime()).toString()}</b>.
                                </div>
                            ) : null }
                            { this.state.chain.slug && this.state.chain.status == "live" ? (
                                <div>
                                    Slug : <b>{this.state.chain.slug}</b>
                                </div>
                            ) : null}
                            { this.state.chain.status ? (
                                <div>
                                    Status : <b>{this.state.chain.status}</b>
                                </div>
                            ) : null}
                            { this.state.chain.slug ? (
                                <div>
                                    Path : <a target='_blank' href={`/series/${this.state.chain.slug}`}>{`/series/${this.state.chain.slug}`}</a>
                                </div>
                            ) : null}

                            <hr />
                            {
                                this.state.chain.status == 'draft' ? (
                                    <ButtonWorker text='Publish' theme='purple' type='fill' work={this.togglePublishState.bind(this)}  />
                                ) : (
                                    <ButtonWorker text='Unpublish' theme='red' type='outline' work={this.togglePublishState.bind(this)}  />
                                )
                            }
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <Spinner centered />
            );
        }
    }
}
