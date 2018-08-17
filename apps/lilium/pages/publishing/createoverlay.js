import { h, Component } from 'preact';

export class CreateOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        return (
            <div id="create-article-overlay">
                <div class="create-article-bg"></div>
                <div class="create-article-left-strip"></div>
                <div class="create-article-right-strip"></div>
            </div>
        )
    }
}