import { h, Component } from 'preact'; 
import { Picker } from './picker';
import API from '../data/api';
import { Spinner } from '../layout/loading';
import { TextField, ButtonWorker, DebouncedField } from '../widgets/form';

export class ChainPicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            chains : []
        }

        this.stage = {};
    }

    static get slug() { 
        return "chain";
    }

    select(chain) {
        Picker.accept({ embedType : "chain", type : "chain", chain });
    }

    componentDidMount() {
        this.search("");
    }

    search(terms) {
        API.get('/chains/search', {
            filters : {
                search : terms || "",
                status : 'live',
                limit : 10
            }
        }, (err, json, r) => {
            this.setState({ chains : json.items, terms : terms || "" });
        });
    }

    render() {
        return (
            <div id="picker-chain">
                <div class="text-field-header">
                    <h2>Search for a content chain</h2>
                    <DebouncedField value={this.state.terms} onDebounce={this.search.bind(this)} />
                </div>
                <div class="chain-list">
                    { this.state.chains.map(chain => (
                        <div index={chain._id} class="chain-list-item" onClick={this.select.bind(this, chain)}>
                            <h3>{chain.title}</h3>
                            <h4>{chain.subtitle}</h4>
                            <h5>{chain.articles.length} articles in this chain.</h5>
                        </div>
                    )) }
                </div>
            </div>
        )
    }
}
