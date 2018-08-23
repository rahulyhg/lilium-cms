import { Component, h } from "preact";

export class CreateContentChain extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    render() {
        return (
            <div id="create-content-chain">
                <h1>Create a new content chain</h1>
            </div>
        );
    }
}
