import { Component, h } from 'preact';
import API from '../../data/api';
import { BigList } from '../../widgets/biglist'

class NotificationStrip extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div class="notification-page-strip">
                <b>{this.props.title}</b>
            </div>
        )
    }
}

export default class NotificationPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            notifications : []
        };
    }

    componentDidMount() {

    }

    render() {
        if (this.state.loading) {
            return (<div>Loading</div>);
        }

        return (
            <div>
                <h1>Notifications</h1>
                <BigList endpoint="/notifications/all" listitem={NotificationStrip} batchsize={50} />
            </div>
        );
    }
}