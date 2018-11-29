import { Component, h } from 'preact';
import { Picker } from './picker';

export class EmbedPicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        }
    }

    static tabTitle = 'Embed';
    static slug = 'embed';
    
    componentDidMount() {
        
    }
    
    render() {
        return (
            <div id="embed-picker" onKeyDown={this.props.onKeyDown.bind(this)}>
                <div>Embed Picker</div>
            </div>
        );
    }
}
