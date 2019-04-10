import { Component, h } from 'preact';
import { Picker } from './picker';
import API from '../data/api';
import { Spinner } from '../layout/loading';
import Modal from '../widgets/modal';
import { TextField, SelectField, ButtonWorker } from '../widgets/form';
import { castNotification } from './notifications';

const EmbedTypeInstagram = props => (<div>
    <div class="embed-topbanner instagram">
        <i class="fab fa-instagram"></i>
        <span>Instagram photo</span>
    </div>
    <div class="embed-preview instagram-preview">
        <img src={props.embed.urlpath} class="instagram-preview-image" alt={props.embed.caption} />
        <div class="instagram-preview-credit">@{props.embed.author}</div>
    </div>
</div>)

const EmbedTypeInstagramVideo = props => (<div>
    <div class="embed-topbanner instagram">
        <i class="fab fa-instagram"></i>
        <span>Instagram video</span>
    </div>
    <div class="embed-preview instagram-preview">
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
    <div class="embed-preview instagram-preview">
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
    <div class="embed-preview twitter-preview">
        <div class="twitter-tweet-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
    </div>
</div>);

const EmbedTypeFacebookPost = props => (<div>
    <div class="embed-topbanner facebook">
        <i class="fab fa-facebook"></i>
        <span>Facebook post</span>
    </div>
    <div class="embed-preview facebook-preview">
        <div class="facebook-preview-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
        <div class="facebook-preview-url">{props.embed.originalurl}</div>
    </div>
</div>)

const EmbedTypeFacebookVideo = props => (<div>
    <div class="embed-topbanner facebook">
        <i class="fab fa-facebook"></i>
        <span>Facebook video</span>
    </div>
    <div class="embed-preview facebook-preview">
        <div class="facebook-preview-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
        <div class="facebook-preview-url">{props.embed.embedurl}</div>
    </div>
</div>)

const EmbedTypeYoutube = props => (<div>
    <div class="embed-topbanner youtube">
        <i class="fab fa-youtube"></i>
        <span>Youtube video</span>
    </div>
    <div class="embed-preview youtube-preview">
        <div class="youtube-preview-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
    </div>
</div>)

const EmbedTypeVimeo = props => (<div>
    <div class="embed-topbanner vimeo">
        <i class="fab fa-vimeo"></i>
        <span>Vimeo video</span>
    </div>
    <div class="embed-preview vimeo-preview">
        <img src={props.embed.thumbnailplay} />
    </div>
</div>)

const EmbedTypeSoundcloud = props => (<div>
    <div class="embed-topbanner soundcloud">
        <i class="fab fa-soundcloud"></i>
        <span>Soundcloud content</span>
    </div>
    <div class="embed-preview soundcloud-preview">
        <div class="soundcloud-preview-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
    </div>
</div>)

const EmbedTypeReddit = props => (<div>
    <div class="embed-topbanner reddit">
        <i class="fab fa-reddit"></i>
        <span>Reddit content</span>
    </div>
    <div class="embed-preview reddit-preview">
        <div class="reddit-preview-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
    </div>
</div>)


const EmbedTypeDefault = props => (<div>
    <div class="embed-topbanner other">
        <i class="far fa-link"></i>
        <span>HTML snippet</span>
    </div>
    <div class="embed-preview other-preview">
        <div class="other-preview-html" dangerouslySetInnerHTML={{ __html : props.embed.html }}></div>
    </div>
</div>);

const embedToComponent = {
    instagram : EmbedTypeInstagram,
    igvideo : EmbedTypeInstagramVideo,
    igcarousel : EmbedTypeInstagramCarousel,
    twitter : EmbedTypeTwitter,
    fbpost : EmbedTypeFacebookPost,
    fbvideo : EmbedTypeFacebookVideo,
    youtube : EmbedTypeYoutube,
    vimeo : EmbedTypeVimeo,
    soundcloud : EmbedTypeSoundcloud,
    reddit : EmbedTypeReddit,
    default : EmbedTypeDefault
};

export function embedToComponentCarousel(type, embed) {
    const ComponentClass = embedToComponent[type] || embedToComponent.default;
    return (
        <div class={"embed-carousel-preview " + type}>
            <ComponentClass embed={embed} />
        </div>
    );
}

class EmbedSingle extends Component {
    constructor(props) {
        super(props);

    }

    fixIframe() {
        const maybeiFrame = this.el.querySelector('iframe');
        if (maybeiFrame) {
            maybeiFrame.setAttribute('width', 250);
            maybeiFrame.setAttribute('height', 250);
        }
    }

    componentDidMount() {
        this.fixIframe();
    }

    componentDidUpdate() {
        this.fixIframe();
    }

    shouldComponentUpdate() {
        return false;
    }

    onClick(ev) {
        Picker.accept({ embedType : "embed", type : "embed", embed : this.props.embed });
    }

    render() {
        const ComponentClass = embedToComponent[this.props.embed.type] || embedToComponent.default;
        return (
            <div ref={x => (this.el = x)} class={"embed-single card flex " + this.props.embed.type} data-id={this.props.embed._id}>
                <ComponentClass embed={this.props.embed} />
                <div class="clickable-area" onClick={this.onClick.bind(this)}>
                    <div class="clickable-area-text">
                        <i class="far fa-check"></i>
                        <span>Use embed</span>
                    </div>
                </div>
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
            loading : true,
            errorMessage: ''
        };

        this.stage = {};
    }

    static tabTitle = 'Embed';
    static slug = 'embed';

    static embedRegexMap = {
        // Not sure if instagram IDs are of constant length but the seem to never be less than 6
        instagram: new RegExp('instagram\.com\/p\/[a-zA-Z0-9]{6,}'),
        igvideo: new RegExp('instagram\.com\/p\/[a-zA-Z0-9]{6,}'),
        igcarousel: new RegExp('instagram\.com\/p\/[a-zA-Z0-9]{6,}'),
        fbpost: new RegExp('facebook\.com\/[a-zA-Z0-9]+\/posts\/[0-9]{10,}'),
        fbvideo: new RegExp('facebook\.com\/[a-zA-Z0-9]+\/videos\/[0-9]{10,}'),
        youtube: new RegExp('youtube\.com\/watch'),
        vimeo: new RegExp('vimeo.com'),
        twitter: new RegExp('twitter\.com\/[a-zA-Z0-9]+\/status\/[0-9]{10,}'),
        soundcloud: new RegExp('soundcloud\.com\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+'),
        reddit: new RegExp('reddit.com'),
    }

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

    getErrorMessageIfAny() {
        const val = this.stage['modal-embed-text'];
        const embedType = this.stage['modal-embed-type'];
        console.log(embedType);
        console.log(val);
        
        if (val) {
            const exp = EmbedPicker.embedRegexMap[embedType];
            console.log(exp.test(val));
            
            if (exp) {
                if (!exp.test(val)) {
                    return 'The URL you have entered appears to not be a valid embed URL'
                }
            }
        }

        return '';
    }

    newEmbedFieldChanged(name, value) {
        this.stage[name] = value;
        this.setState({ errorMessage: this.getErrorMessageIfAny() });
        console.log(this.state);
        
    }

    fetchEmbed(done) {
        if (this.stage["modal-embed-type"] && this.stage["modal-embed-text"]) {
            API.get('/embed/fetch/' + this.stage["modal-embed-type"], { url : this.stage["modal-embed-text"] }, (err, json, r) => {
                if (json && json.embed) {
                    this.setState({ embeds : [json.embed, ...this.state.embeds], newModalOpen : false });
                    done();
                } else {
                    log('Embed', "There was an error embedding this resources.", "err");
                    castNotification({
                        type: 'error',
                        title: 'Error while fetching embed',
                        message: 'There was an error fetching this embed. Make sure you selected the correct embed type and that your URL is valid'
                    });
                    done && done();
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
                <div>
                    <Spinner centered />
                </div>
            );
        }

        return (
            <div id="embed-picker">
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
                            { text: "Instagram photo", value : "instagram"},
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
                            onChange={this.newEmbedFieldChanged.bind(this)}
                            value={this.stage['modal-embed-text']}
                            type='url' />
                    </div>

                    {
                        this.state.errorMessage ? (
                            <p id="embed-error-message">{this.state.errorMessage}</p>
                        ) : null
                    }

                    <div style={{ textAlign : 'right' }}>
                        <ButtonWorker text="Cancel" type="outline" theme="red" sync={true} work={() => { this.setState({ newModalOpen: false }); }} />
                        <ButtonWorker text="Generate embed" type="fill" theme="purple" work={this.fetchEmbed.bind(this)} />
                    </div>
                </Modal>
            </div>
        );
    }
}
