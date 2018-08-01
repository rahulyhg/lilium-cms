import { Component, h } from 'preact';
import { Link } from '../routing/link';
import { LILIUM } from '../data/const';
import { bindRealtimeEvent, unbindRealtimeEvent } from '../realtime/connection';
import { AnimeNumber } from '../widgets/animenumber';
import API from '../data/api';

const styles = {
    dropdownwrap : {
        color : "white",
        fontSize: 16,
        width: 200,
        textAlign: "center",
        background : "#2d2d2d",
        borderLeft : "1px solid #444",
        cursor : "pointer"
    },
    dropdownname : {
        boxSizing : "border-box",
        height : 50,
        paddingTop : 14
    }
};

class HeaderUserDropdown extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : props.session,
            open : false
        } 

        this.clickClose_bound = this.maybeCloseFromDocumentClick.bind(this);
    }

    componentDidMount() {
        document.addEventListener('navigate', ev => {
            this.state.open && this.forceClose();
        });
    }

    componentWillReceiveProps(props) {
        props.session && this.setState({ session : props.session });
    }

    maybeCloseFromDocumentClick(ev) {
        if (!this.el.contains(ev.target) && ev.target != this.el) {
            this.forceClose();
        }
    }

    forceClose() {
        log('Dropdown', 'User dropdown menu was closed', 'detail');
        this.setState({ open : false }, () => {
            document.removeEventListener('click', this.clickClose_bound);
        })
    }

    forceOpen() {
        log('Dropdown', 'User dropdown menu was open', 'detail');
        this.setState({ open : true }, () => {
            document.addEventListener('click', this.clickClose_bound);
        })
    }

    toggle() {
        this.state.open ? this.forceClose() : this.forceOpen();
    }

    clicked() {
        this.toggle();
    }

    render() {
        if (!this.state.session) {
            return null;
        }

        log('HeaderUser', 'User dropdown was rerendered', 'detail');
        return (
            <div style={styles.dropdownwrap} ref={that => (this.el = that)}>
                <div style={styles.dropdownname} onClick={this.clicked.bind(this)}>
                    {this.state.session.displayname}
                </div>
                {
                    this.state.open ? (<div class="dropdown-menu">
                        <Link href="/me" linkStyle="block">Profile</Link>
                        <Link href="/logout" linkStyle="block">Logout</Link>
                    </div>) : null
                }
            </div>
        )
    }
}

class HeaderRealtimeCounter extends Component {
    constructor(props) {
        super(props);
        this.state = {
            totalRT : 0
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
    }

    render() {
        return this.state.totalRT ? (
            <div id="headerRtCounter">
                <b><AnimeNumber number={this.state.totalRT} /></b>
                <span> active readers</span>
            </div>
        ) : null;
    }
}

export class Header extends Component {
    constructor(props) {
        super(props);
        this.state = {
            session : undefined,
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
                    <HeaderRealtimeCounter />
                </div>
                <div class="header-section header-section-right">
                    <HeaderUserDropdown session={this.state.session} />
                </div>
            </header>
        )
    }
}
