import { Component, h } from 'preact';
import { Picker } from './picker';
import API from '../data/api';
import { Spinner } from '../layout/loading';
import Modal from '../widgets/modal';
import { TextField, SelectField, ButtonWorker } from '../widgets/form';

const EmbedTypeInstagram = props => (<div>
    <div class="embed-topbanner instagram">
        <i class="fab fa-instagram"></i>
        <span>Instagram photo</span>
    </div>
    <div class="instagram-preview">
        <img src={props.embed.urlpath} class="instagram-preview-image" alt={props.embed.caption} />
        <div class="instagram-preview-credit">@{props.embed.author}</div>
    </div>
</div>)

const EmbedTypeInstagramVideo = props => (<div>
    <div class="embed-topbanner instagram">
        <i class="fab fa-instagram"></i>
        <span>Instagram video</span>
    </div>
    <div class="instagram-preview">
        <img src={props.embed.urlpath} class="instagram-preview-image" alt={props.embed.caption} />
        <div class="instagram-preview-credit">@{props.embed.author}</div>
        <i class="fas fa-play"></i>
    </div>
</div>)

const EmbedTypeInstagramCarousel = props => (<div>
    <div class="embed-topbanner instagram">
        <i class="fab fa-instagram"></i>
        <span>Instagram carousel</span>
    </div>
    <div class="instagram-preview">
        <img src={props.embed.urlpath} class="instagram-preview-image" alt={props.embed.caption} />
        <div class="instagram-preview-credit">@{props.embed.author}</div>
        <i class="fal fa-columns"></i>
    </div>
</div>)

const EmbedTypeTwitter = props => (<div>
    <div class="embed-topbanner twitter">
        <i class="fab fa-twitter"></i>
        <span>Twitter embed</span>
    </div>
    <div class="twitter-preview">
        <div class="twitter-tweet-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
    </div>
</div>);

const EmbedTypeDefault = props => (<div>
    
</div>);

const embedToComponent = {
    instagram : EmbedTypeInstagram,
    igvideo : EmbedTypeInstagramVideo,
    igcarousel : EmbedTypeInstagramCarousel,
    twitter : EmbedTypeTwitter,
    default : EmbedTypeDefault
};

class EmbedSingle extends Component {
    constructor(props) {
        super(props);

    }

    render() {
        const ComponentClass = embedToComponent[this.props.embed.type] || embedToComponent.default;
        return (
            <div class={"embed-single card flex " + this.props.embed.type} data-id={this.props.embed._id}>
                <ComponentClass embed={this.props.embed} />
            </div>
        );
    }
}

export class EmbedPicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            embeds : [],
            batchIndex : 0,
            loading : true
        };

        this.stage = {};
    }

    static tabTitle = 'Embed';
    static slug = 'embed';

    fetchNextBatch() {
        API.get('/embed/bunch', {
            skip : this.state.batchIndex
        }, (err, json, r) => {
            this.setState({ 
                embeds : [...this.state.embeds, ...json.items], 
                batchIndex : this.state.batchIndex + 1,
                loading : false
            });
        });
    }
    
    componentDidMount() {
        this.fetchNextBatch();
    }

    newEmbedFieldChanged(name, value) {
        this.stage[name] = value
    }

    fetchEmbed(done) {
        if (this.stage["modal-embed-type"] && this.stage["modal-embed-text"]) {
            API.get('/embed/fetch/' + this.stage["modal-embed-type"], { url : this.stage["modal-embed-text"] }, (err, json, r) => {
                if (json && json.embed) {
                    this.setState({ embeds : [json.embed, ...this.state.embeds], newModalOpen : false });
                    done();
                } else {
                    log('Embed', "There was an error embedding this resources.", "err");
                }
            });
        } else {
            log('Embed', "You must provide a URL and an embed type.", "warn");
            done();
        }
    }
    
    render() {
        if (this.state.loading) {
            return (
                <div onKeyDown={this.props.onKeyDown.bind(this)}>
                    <Spinner centered />
                </div>
            );
        }

        return (
            <div id="embed-picker" onKeyDown={this.props.onKeyDown.bind(this)}>
                <div class="embed-picker-list">
                    <div class="embed-add embed-single card flex" onClick={() => this.setState({ newModalOpen : true })}>
                        <i class="fal fa-plus"></i>
                        <div>Create embed</div>
                    </div> 
                    { this.state.embeds.map(x => (<EmbedSingle embed={x} key={x._id} />)) }
                </div>
                <Modal visible={this.state.newModalOpen} title="New embed" onClose={() => { this.setState({ newModalOpen : false }); this.stage = {}; }}>
                    <div>
                        <SelectField name="modal-embed-type" placeholder="Embed type" options={[
                            { text: "Instagram photo", value : "instagram" },
                            { text: "Instagram video", value: "igvideo"},
                            { text: "Instagram carousel", value: "igcarousel"},
                            { text: "Facebook Post", value: "fbpost"},
                            { text: "Facebook Video", value: "fbvideo"},
                            { text: "Youtube video", value: "youtube"},
                            { text: "Vimeo video", value: "vimeo"},
                            { text: "Twitter tweet", value: "twitter"},
                            { text: "Soundcloud song", value: "soundcloud"},
                            { text: "Reddit", value: "reddit"},
                            { text: "HTML code", value: "html"}
                        ]} onChange={this.newEmbedFieldChanged.bind(this)} />

                        <TextField 
                            name="modal-embed-text" placeholder="URL of embed resources" 
                            onChange={this.newEmbedFieldChanged.bind(this)} />
                    </div>
                    <div style={{ textAlign : 'right' }}>
                        <ButtonWorker text="Generate embed" type="outline" theme="white" work={this.fetchEmbed.bind(this)} />
                    </div>
                </Modal>
            </div>
        );
    }
}
