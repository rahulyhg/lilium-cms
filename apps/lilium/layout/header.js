import { Component, h } from 'preact';
import { Link } from '../routing/link';
import { LILIUM } from '../data/const';
import { bindRealtimeEvent, unbindRealtimeEvent } from '../realtime/connection';
import { AnimeNumber } from '../widgets/animenumber';
import { Spinner } from '../layout/loading';
import dateformat from 'dateformat';
import API from '../data/api';

class HeaderUserDropdown extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : props.session
        } 
    }

    componentDidMount() {
        document.addEventListener('navigate', this.close.bind(this));
    }

    open() {
        this.setState({ open : true });
    }

    close() {
        this.setState({ open : false });
    }

    componentWillReceiveProps(props) {
        props.session && this.setState({ session : props.session });
    }

    render() {
        if (!this.state.session) {
            return null;
        }

        log('HeaderUser', 'User dropdown was rerendered', 'detail');
        return (
            <div class="header-bar-avatar-wrapper">
                <div onClick={this.open.bind(this)}>
                    <img src={liliumcms.session.avatarURL} class="header-bar-avatar" />
                </div>

                { this.state.open ? (
                    <div class="header-dropdown">
                        <Link href="/me" display="block">
                            Profile
                        </Link>
                        <Link href="/me#password" display="block">
                            Change password
                        </Link>
                        <Link href="/logout" display="block">
                            Logout
                        </Link>
                    </div>
                ) : null }
            </div>
        )
    }
}

class HeaderRealtimeCounter extends Component {
    constructor(props) {
        super(props);
        this.state = {
            totalRT : 0,
            visible : false
        };
    }

    componentWillUnmount() {
        unbindRealtimeEvent('analytics_realtime', this.rte);
    }

    componentDidMount() {
        this.rte = bindRealtimeEvent("analytics_realtime", data => {
            data && data.total && this.setState({ totalRT : data.total });
        });

        API.get('/googleanalytics/realtime', {}, (err, data) => {
            data && data.total && this.setState({ totalRT : data.total });
        });

        document.addEventListener('toggleactivereadersheader', () => {
            this.setState({ visible : liliumcms.session.preferences.activeReadersHeader })
        });

        this.setState({ visible : liliumcms.session.preferences.activeReadersHeader })
    }

    render() {
        if (!this.state.visible) {
            return null;
        }

        return this.state.totalRT ? (
            <div id="headerRtCounter">
                <b><AnimeNumber number={this.state.totalRT} /></b>
                <span> active readers</span>
            </div>
        ) : null;
    }
}

class NotificationItem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            unseen : this.props.unseen
        };
    }

    componentDidMount() {

    }

    clicked(ev) {
        if (this.props.notification.url) {
            window.open(this.props.notification.url);
        }

        if (this.state.unseen) {
            API.post('/notifications/seeone/' + this.props.notification._id, {}, () => {});

            this.props.saw(this.props.notification);
            this.setState({unseen : false})
        }
    }

    render() {
        return (
            <div key={this.props.key} onClick={this.clicked.bind(this)} class={"header-notification header-notification-" + this.props.notification.type + (this.state.unseen ? " unseen" : "") + (this.props.notification.url ? " clickable" : "") }>
                <b class="header-notification-title">{this.props.notification.title}</b>
                <p class="header-notification-message">{this.props.notification.msg}</p>
                <span class="header-notification-date">{dateformat(this.props.notification.date, 'mmmm dd, HH:MM')}</span>
            </div>
        );
    }
}

class NotificationLists extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : true,
            section : "unseen"
        };
    }

    componentDidMount() {
        API.get('/notifications', {}, (err, notifications) => this.setState({ notifications, loading : false }));
    }

    changeSection(section) {
        this.setState({ section });
    }

    sawOne(notification) {
        const index = this.state.notifications.unseen.findIndex(x => x == notification);
        const seen = [notification, ...this.state.notifications.seen];
        const unseen = [...this.state.notifications.unseen.splice(0, index), ...this.state.notifications.unseen.splice(1)];
        this.setState({
            notifications : {
                unseen, seen
            }
        });

        this.props.saw(notification);
    }

    markAllAsRead() {
        API.post('/notifications/seeall', {}, () => {
            this.setState({
                notifications : {
                    unseen : [],
                    seen : this.state.notifications.seen
                }
            })

            this.props.sawall();
        });
    }

    render() {
        if (this.state.loading) {
            return (
                <div class="notification-dropdown-list loading">
                    <Spinner centered={true} />
                </div>
            );
        }

        return (                
            <div class="notification-dropdown-list">
                <div class="notification-dropdown-sections-select">
                    <b class={this.state.section == "unseen" ? "selected" : ""} onClick={this.changeSection.bind(this, 'unseen')}>Unseen</b>
                    <b class={this.state.section == "seen"   ? "selected" : ""} onClick={this.changeSection.bind(this, 'seen')  }>Seen</b>
                </div>

                { this.state.section == "unseen" && (
                    <div>
                        <div class="notification-dropdown-section">
                            {
                                this.state.notifications.unseen.length == 0 ? (
                                    <div class="notification-dropdown-empty">
                                        <i class="far fa-inbox"></i>
                                        <b>You're up to date!</b>
                                    </div>
                                ) : this.state.notifications.unseen.map(x => <NotificationItem key={x._id} saw={this.sawOne.bind(this)} unseen={true} notification={x} />)
                            }
                        </div> 

                        { this.state.notifications.unseen.length != 0 && (
                            <div class="notification-dropdown-seeall" onClick={this.markAllAsRead.bind(this)}>
                                <b>Mark all as read</b>
                            </div>
                        ) }
                    </div>
                )}

                { this.state.section == "seen" && (
                    <div>
                        <div class="notification-dropdown-section">
                            {this.state.notifications.seen.map(x => <NotificationItem key={x._id} unseen={false} notification={x} />)}
                        </div>

                        <div class="notification-dropdown-seeall">
                            <Link linkStyle="block" href="/notifications">
                                <b>See all notifications</b>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

class NotificationJewel extends Component {
    constructor(props) {
        super(props);
        this.state = {
            unreadCount : 0
        }

        this.receivedNotification_bound = this.receivedNotification.bind(this);        
        this.maybeClose_bound = this.maybeClose.bind(this);
    }

    componentDidMount() {
        API.get('/notifications/unreadcount', {}, (err, resp, r) => {
            this.setState({ unreadCount : resp.unreadCount });
        });

        bindRealtimeEvent('notification', this.receivedNotification_bound);
    }

    componentWillUnmount() {
        unbindRealtimeEvent('notification', this.receivedNotification_bound);
    }

    receivedNotification() {
        this.setState({ unreadCount : this.state.unreadCount + 1 });
    }

    maybeClose(ev) {
        !this.el.contains(ev.target) && this.el != ev.target && this.close();
    }

    sawOne() { this.setState({ unreadCount : this.state.unreadCount - 1 }); }
    sawAll() { this.setState({ unreadCount : 0 }); }
    open()   { this.setState({ open : true }); document.addEventListener('click', this.maybeClose_bound); }
    close()  { this.setState({ open : false }); document.removeEventListener('click', this.maybeClose_bound); }

    toggle() { this.state.open ? this.close() : this.open(); }

    render() {
        return (
            <div class="header-jewel" ref={ el => (this.el = el) }>
                <div class="header-jewel-icon notification-dropdown-icon" onClick={this.toggle.bind(this)}>
                    <i class="fal fa-inbox"></i>
                    <b class={"header-notification-number " + (this.state.unreadCount == 0 ? "hidden" : "")}>{this.state.unreadCount}</b>
                </div>

                { this.state.open ? <NotificationLists sawall={this.sawAll.bind(this)} saw={this.sawOne.bind(this)} /> : null }
             </div>
        )
    }
}

class HeaderJewels extends Component { 
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="header-jewels">
                <NotificationJewel />
            </div>
        );
    }
}

class HeaderPageTitle extends Component {
    constructor(props) {
        super(props);
        this.state = {
            title : "",
            webtitle : document.title
        }

        this.originalWebTitle = document.title;
    }

    componentDidMount() {
        document.addEventListener('renderedURL', ev => {
            log('PageTitle', 'Received renderedURL event, about to update page title', 'detail');
            const { CurrentContainer } = ev.detail;

            if (CurrentContainer.pagesettings && CurrentContainer.pagesettings.title) {            
                log('PageTitle', 'Setting new page title : ' + CurrentContainer.pagesettings.title, 'detail');
                this.setState({ title : CurrentContainer.pagesettings.title });
            } else {
                log('PageTitle', 'No page title found, defaulting to empty string', 'detail');
                this.setState({ title : "" });
            }
        });
    }

    render() {
        document.title = this.originalWebTitle + (this.state.title ? (" | " + this.state.title) : "");

        if (true || !this.state.title) {
            return null;
        }

        return (
            <div>{this.state.title}<span> | </span></div>   
        );
    }
}

export class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : props.session,
            totalRT : 0,
            ready : false
        }
    }

    componentWillReceiveProps(props) {
        if (props.session) {
            this.setState({session : props.session});
        }
    }

    render() {
        if (!this.state.session) {        
            log('Header', 'Rendering header component without a session', 'layout');
            return (<header></header>);
        }

        return (
            <header>
                <div class="header-section header-section-left">
                    <Link href="/dashboard">
                        <div id="lilium-logo-wrapper">
                            <img id="lilium-logo" src="/static/media/lmllogo.png" />
                            <span id="lilium-brandname" class="ptext">{LILIUM.vendor}</span>
                        </div>
                    </Link>
                    <HeaderPageTitle />
                    <HeaderRealtimeCounter />
                </div>
                <div class="header-section header-section-right">
                    <HeaderUserDropdown session={this.state.session} />
                    <HeaderJewels />
                </div>
            </header>
        )
    }
}
