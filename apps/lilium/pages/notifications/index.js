import { Component, h } from 'preact';
import API from '../../data/api';
import { BigList } from '../../widgets/biglist'
import dateformat from 'dateformat';

const styles = {
    fullbutton : {
        width: "100%",
        border: "1px solid #333",
        background: "#333",
        color: "#EEE",
        textAlign: "center",
        padding: 10,
        cursor: "pointer",
        boxSizing: "border-box"
    }
}

class NotificationStrip extends Component {
    constructor(props) {
        super(props);
        this.state = props.item;
    }

    clicked() {
        if (this.state.url) {
            window.open(this.state.url);
        }
    }

    render() {
        return (
            <div key={this.state._id} onClick={this.clicked.bind(this)} style={{ cursor : this.state.url ? "pointer" : "" }} class={"notification-page-strip notification-page-strip-" + this.state.type + (this.state.interacted ? "" : " unread")}>
                <div class="title"><b>{this.state.title}</b> | {dateformat(this.state.date, 'mmmm dd, HH:MM')}</div>
                <p dangerouslySetInnerHTML={{__html : this.state.msg}}></p>
            </div>
        )
    }
}

class NotificationLoadMore extends Component {
    constructor(props) {
        super(props);
    }

    onClick() {
        this.props.onClick();
    }

    render() {
        return (
            <div style={styles.fullbutton} onClick={this.onClick.bind(this)}>
                <b>Load more notifications</b>
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
                <div class="leader-title">
                    <div class="leader-title-responsive">
                        <h1>Notifications</h1>
                        <p>A list of notifications sent to you from Lilium.</p>
                    </div>
                </div>

                <div class="leader-content classic">
                    <BigList loadmoreButton={NotificationLoadMore} endpoint="/notifications/all" listitem={NotificationStrip} batchsize={50} livevarkey="" />
                </div>
            </div>
        );
    }
}
