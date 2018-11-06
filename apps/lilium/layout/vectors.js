import { Component, h } from 'preact';

export class VectorImage extends Component {
    render() {
        return (
            <img src={"/static/svg/"+this.props.image+".svg"} class="vector-image" />
        )
    }
}