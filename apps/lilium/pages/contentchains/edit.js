import { Component, h } from "preact";
import API from "../../data/api";
import { castNotification } from '../../layout/notifications'
import { TextField } from "../../widgets/form";
import { TextEditor } from '../../widgets/texteditor';

class Article extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }
    
    componentDidMount() {
        
    }
    
    render() {
        return (
            <div className="article">
            </div>
        );
    }
}

export class EditContentChain extends Component {
    constructor(props) {
        super(props);
        this.values = {};
        this.state = this.props.chain || {};
        this.state.loading = true;
        console.log(this.props);
        console.log(this.state);
    }

    componentDidMount() {
        // If no chain was passed as an extra, make the request
        if (!this.state._id) {
            API.get(`/chains/${this.props.id}`, {}, (err, data, r) => {
                console.log(data);
                if (r.status == 200) {
                    this.setState({...data, loading: false});
                    console.log(this.state);
                } else {
                    castNotification({
                        title: 'Error while fetching content chain data from the server',
                        type: 'error'
                    })
                }
            });
        }
    }

    updateValues(name, val) {
        this.state[name] = val;
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="content-chains-edit">
                    <h1>Edit Content Chain</h1>
                    <TextField name='title' initialValue={this.state.title} onChange={this.updateValues.bind(this)} />
                    <TextField name='subtitle' initialValue={this.state.subtitle} onChange={this.updateValues.bind(this)} />
                    <TextEditor name='presentation' content={this.state.presentation} onChange={this.updateValues.bind(this)} />
    
                    <div id="articles">
                        {
                            this.state.articles.map(article => {
                                return (<h3>{article._id}</h3>)
                            })
                        }
                    </div>
                </div>
            );
        } else {
            return (
                <p>loading...</p>
            );
        }
    }
}
