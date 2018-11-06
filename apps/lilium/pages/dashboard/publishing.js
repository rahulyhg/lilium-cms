import { h, Component } from "preact";
import { bindRealtimeEvent, unbindRealtimeEvent } from '../../realtime/connection';

export class PublishingTab extends Component {
    static get tabprops() {
        return {
            text : "Publishing",
            right : "dashboard",
            id : "publishing"
        }
    }

    componentDidMount() {
        this.rtid = bindRealtimeEvent("analytics_realtime", data => {
            data && data.total && false;
        });
    }

    componentWillUnmount() {
        unbindRealtimeEvent('analytics_realtime', this.rtid);
    }

    render() {
        return (
            <h2>Publishing dashboard</h2>
        )
    }
}
