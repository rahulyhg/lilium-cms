import { Component, h } from "preact";

export class ListContentChains extends Component {
    constructor(props) {
        super(props);
        this.state = { contentChains: [] };
    }

    render() {
        return (
            <div id="content-chains-list">
                <h1>Content Chains</h1>
            </div>
        );
    }
}
