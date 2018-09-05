import { h, Component } from "preact";
import { BigList } from '../../widgets/biglist';

class FlagListItem extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div class="flag-list-item">
                {this.props.item.message}
            </div>
        )
    }
}

export default class ListView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            
        };
    }
    
    componentDidMount() {
        
    }
    
    render() {
        return (
            <div style={{ maxWidth : 720, margin: "20px auto" }}>
                <h1>Flagging</h1>
                <div>
                    <BigList endpoint="/flagging/bunch" listitem={FlagListItem} batchsize={50} />
                </div>
            </div>
        );
    }
}