import { Component, h } from 'preact';
import { Picker } from './picker';
import API from '../data/api';
import { Spinner } from '../layout/loading';

const EmbedTypeInstagram = props => (<div>
    <div class="embed-topbanner">
        <i class="fab fa-instagram"></i>
        <span>Instagram photo</span>
    </div>
    <div class="instagram-preview">
        <img src={props.embed.urlpath} class="instagram-preview-image" />
    </div>
    <div>
        <div class="instagram-preview-credit">@{props.embed.author}</div>
        <p>{props.embed.caption.substring(0, 80) + (props.embed.caption.length > 80 ? "..." : "")}</p>
    </div>
</div>)

const EmbedTypeTwitter = props => (<div>
    <div class="embed-topbanner">
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
                <div class="embed-add embed-single card flex">
                    <i class="fal fa-plus"></i>
                    <div>New embed</div>
                </div> 
                { this.state.embeds.map(x => (<EmbedSingle embed={x} />)) }
            </div>
        );
    }
}
