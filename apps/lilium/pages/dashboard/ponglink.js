import { h, Component } from "preact";

export class PonglinkTab extends Component {
    static get tabprops() {
        return {
            text : "Ponglinks",
            right : "ponglink",
            id : "ponglink"
        }
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    render() {
        return (
            <h2>Ponglinks dashboard</h2>
        )
    }
}

