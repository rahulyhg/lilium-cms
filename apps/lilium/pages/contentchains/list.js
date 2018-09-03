import { Component, h } from "preact";
import { ArticlePicker } from "../../widgets/articlepicker";
import { BigList} from '../../widgets/biglist';

export class ListContentChains extends Component {
    constructor(props) {
        super(props);
        this.state = { contentChains: [
            {
                title: 'First Content Chain',
                subtitle: 'Very nice content',
                articles: []
            }
        ] };
    }

    render() {
        return (
            <div id="content-chains-list">
                <h1>Content Chains</h1>
                <BigList endpoint='/chains' />
            </div>
        );
    }
}
