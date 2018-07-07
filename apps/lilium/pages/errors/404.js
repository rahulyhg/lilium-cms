import { Component, h } from "preact";

export default class e404 extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div class="error-page" id="e404">
                <h1>This page does not exist</h1>
            </div>
        );
    }
}