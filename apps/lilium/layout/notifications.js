import { h, Component } from 'preact';
import { bindRealtimeEvent, unbindRealtimeEvent } from '../realtime/connection'

const styles = {
    wrapper : {
        position: "fixed",
        right: 0,
        bottom: 0,
        padding: 10,
        zIndex: 20
    }
};

class LiliumNotification {
    static get defaultOptions() {
        return {
            type : "white",
            timeout : 6500,
            title : "Head's up!",
            message : "",
            link : "",
            click : () => {}
        }
    }

    constructor(opt = {}) {
        opt = Object.assign(LiliumNotification.defaultOptions, opt);
        this.id = Date.now().toString() + Math.random().toString().substring(2);

        Object.keys(opt).forEach(k => {
            this[k] = opt[k];
        });
    }
}

const ANIMATION_TIME = 200;

export class NotificationStrip extends Component {
    constructor(props) {
        super(props);
        this.state = {
            slidout : true
        };

        this.notification = props.notification;
    }

    componentDidMount() {
        if (this.notification.timeout != 0) {
            this.tm = setTimeout(this.dismiss.bind(this), this.notification.timeout);
        }

        setTimeout(() => {
            this.setState({ slidout : false });
        }, 20);
    }

    dismiss() {
        this.tm && clearTimeout(this.tm);
        setTimeout(() => {
            this.props.dismiss(this.notification.id);
        }, ANIMATION_TIME);

        this.setState({ slidout : true });
    }

    clicked() {
        this.props.click && this.props.click();
        this.dismiss();
    }

    render() {
        return (
            <div class={"notification-strip notif-style-" + this.notification.type + " " + (this.state.slidout ? "hidden" : "")} onClick={this.clicked.bind(this)}>
                <b>{this.notification.title}</b>
                <span>{this.notification.message}</span>
            </div>
        );
    }
}

let _singleton;
export class NotificationWrapper extends Component {
    constructor(props) {
        super(props);
        this.state = {
            notifications : []
        };

        this.receivedNotification_bound = this.receivedNotification.bind(this);
    }

    componentDidMount() {
        _singleton = this;
        bindRealtimeEvent('notification', this.receivedNotification_bound);
    }

    componentWillUnmount() {
        unbindRealtimeEvent('notification', this.receivedNotification_bound)
    }

    receivedNotification(n) {
        this.push({
            type : n.type,
            timeout : n.timeout || 6500,
            title : n.title,
            message : n.msg,
            link : n.link,
        });
    }

    push(notification) {
        const notifications = this.state.notifications;
        notifications.push(notification);

        this.setState({ notifications });
    }

    remove(notifid) {
        const index = this.state.notifications.findIndex(x => x.id == notifid);
        if (index != -1) {
            const notifications = [...this.state.notifications];
            notifications.splice(index, 1);
            this.setState({ notifications });
        }
    }

    render() {
        return (
            <div id="notification-wrapper" style={styles.wrapper}>
                {
                    this.state.notifications.map(n => <NotificationStrip key={n.id} notification={n} dismiss={this.remove.bind(this)} />)
                }
            </div>
        )
    }
}

export function castNotification(param) {
    const n = new LiliumNotification(param);    
    log('Notif', 'Casting Lilium notification with type : ' + n.type, 'detail');
    _singleton.push(n);

    const event = new CustomEvent('notification', {detail : { notification : n }});
    document.dispatchEvent(event);

    return n.id;
}