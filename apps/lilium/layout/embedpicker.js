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
        <img src={props.embed.urlpath} class="instagram-preview-image" />
        <div class="instagram-preview-credit">@{props.embed.author}</div>
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
            <div class={"embed-single card flex " + this.props.embed.type}>
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
                    { this.state.embeds.map(x => (<EmbedSingle embed={x} />)) }
                </div>
                <Modal visible={this.state.newModalOpen} title="New embed" onClose={() => this.setState({ newModalOpen : false })}>
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
                        <ButtonWorker text="Generate embed" type="outline" theme="white" />
                    </div>
                </Modal>
            </div>
        );
    }
}
