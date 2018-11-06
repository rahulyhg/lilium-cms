import { h, Component } from "preact";

export class PerformanceTab extends Component {
    static get tabprops() {
        return {
            text : "My performance",
            right : "create-articles",
            id : "performance"
        }
    }

    componentDidMount() {

    }

    componentWillUnmount() {

    }

    render() {
        return (
            <h2>Performance dashboard</h2>
        )
    }
}

