import { h, Component } from 'preact';

import { Spinner } from '../../layout/loading';
import API from '../../data/api';
import { getSession } from '../../data/cache';
import { dismissOverlay } from '../../overlay/overlaywrap';
import dateformat from 'dateformat';
import { AnimeNumber } from '../../widgets/animenumber';
import { getTimeAgo } from '../../widgets/timeago';

class TimeSpentOnArticle extends Component {
    constructor(props) {
        super(props);
        this.user = props.user || {
            displayname : "Inactive user",
            avatarURL : "/static/media/lmllogo.png"
        }

        this.timeago = getTimeAgo(props.timespent);
    }

    render() {
        return (
            <div class="time-spent-on-post">
                <img src={this.user.avatarURL} />
                <span>
                    <b>{this.user.displayname}</b> spent <AnimeNumber number={this.timeago.value} duration={1000} /> {this.timeago.unit}
                </span>
            </div>
        )
    }
}

class PublishedReportDetails extends Component {
    constructor(props) {
        super(props);

        this.timeToPublish = getTimeAgo(props.report.timespent);
        const cachedUsers = {};
        getSession("entities").forEach(x => {
            cachedUsers[x._id] = x;
        });
        this.cachedUsers = cachedUsers;
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({ shown : true })
        }, 2000);
    }

    popAnimeNumber(number, span, animenumber) {
        span.style.transform = "scale(1.3)";
        setTimeout(() => {
            span.style.transform = "";
        }, 800);
    }

    render() {
        return this.state.shown ? (
            <div class="full-pub-report">
                <div class="card floating">
                    <AnimeNumber number={this.props.report.websitetotal} duration={1000} onReady={this.popAnimeNumber.bind(this)} />
                    <b class="pub-report-title">articles on the website</b>
                </div>
                <div class="card floating">
                    <AnimeNumber number={this.props.report.authortotal} duration={1000} />
                    <b class="pub-report-title">articles by {this.props.report.fullauthor.displayname}</b>
                </div>
                <div class="card floating">
                    <AnimeNumber number={this.props.report.authortotaltoday} duration={1000} />
                    <b class="pub-report-title">published today</b>
                </div>
                <div class="card full">
                    <div class="detail-head">
                        <div class="bubble-wrap">
                            <b>Time spent working on this article</b>
                        </div>
                    </div>
                    <div class="detail-list">
                        { this.props.report.totaltime.map(t => (<TimeSpentOnArticle timespent={t.timespent} user={this.cachedUsers[t.userid]} />)) }
                        
                    </div>
                </div>
                <div class="card full">
                    <div class="detail-head">
                        <div class="bubble-wrap">
                            <b>More about this article</b>
                        </div>
                    </div>
                    <div class="detail-list">
                        <div>Created : <AnimeNumber number={this.timeToPublish.value} duration={1000} /> {this.timeToPublish.unit} ago</div>
                        <div>Number of paragraphs : <b><AnimeNumber number={this.props.report.p} duration={1000} /></b></div>
                        <div>Number of images : <b><AnimeNumber number={this.props.report.img} duration={1000} /></b></div>
                        <div>Number of ads : <b><AnimeNumber number={this.props.report.ads} duration={1000} /></b></div>
                        <div>Sponsored post : <b>{this.props.report.isSponsored ? "Yes" : "No"}</b></div>
                        <div>Not safe for work : <b>{this.props.report.nsfw ? "Yes" : "No"}</b></div>
                        <div>Paginated article : <b>{this.props.report.paginated ? "Yes" : "No"}</b></div>
                        <div>Full URL : <a href={this.props.report.url} target="_blank">{this.props.report.url}</a></div>
                    </div>
                </div>
                <div class="card full publishing-overlay-dismiss" onClick={this.props.onDismiss.bind(this)}>
                    <i class="far fa-chevron-left" style={{ marginRight: 20 }}></i>
                    <span>Dismiss</span>
                </div>
            </div>
        ) : null;
    }
}

const PUBLISHED_CARD_CONST_WIDTH = 360;

class PublishedReportCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            visible : !props.last,
            last : props.last
        };

        this.ago = !props.placeholder && getTimeAgo(new Date() - new Date(this.props.post.date));
    }

    componentDidMount() {
        if (!this.state.visible) {
            setTimeout(() => {
                this.setState({ visible : true })
            }, 2000);
        }
    }

    componentWillReceiveProps(props) {
        this.setState({
            visible : props.visible
        });
    }

    render() {
        if (this.props.placeholder) {
            return (
                <div style={{ width : PUBLISHED_CARD_CONST_WIDTH }} class={ "card publish-report-card placeholder" }>

                </div>
            )
        }

        return this.state.visible ? (
            <div style={{ width : PUBLISHED_CARD_CONST_WIDTH }} class={ "card publish-report-card " + (this.state.last ? "last " : " ") }>
                <a class="image-wrapper" href={this.props.post.url} target="_blank">
                    <img class="pub-report-card-facebookmedia" src={this.props.post.facebookmedia} />
                </a>
                <div class="pub-report-card-headline">{this.props.post.headline}</div>
                <div class="pub-report-card-subline">{this.props.post.subline}</div>

                <footer>
                    {this.ago.toString()} | {this.props.author.displayname}
                </footer>
            </div>
        ) : null;
    }
}

class PublishedReportSlider extends Component {
    constructor(props) {
        super(props);
        this.state = {
            width: (PUBLISHED_CARD_CONST_WIDTH + 20) * (this.props.posts.length),
            posts : props.posts
        };

        const cachedUsers = {};
        getSession("entities").forEach(x => {
            cachedUsers[x._id] = x;
        });
        this.cachedUsers = cachedUsers;
    }

    getCardAuthor(authorid) {
        return this.cachedUsers[authorid] || {
            displayname : "Inactive user",
            avatarURL : "/static/media/lmllogo.png"
        };
    }

    componentWillUnmount() {
        this.sliderref.classList.remove("slid");
    }

    componentDidMount() {
        setTimeout(() => {
            this.sliderref.classList.add("slid");
        }, 100);
    }

    render() {
        return (
            <div class="publish-report-cards" ref={r => (this.sliderref = r)} style={{ width: this.state.width }}>
                {
                    this.state.posts.map((x, i) => (
                        <PublishedReportCard post={x} author={this.getCardAuthor(x.author)} last={i == (this.state.posts.length - 1)} />
                    ))
                }
            </div>
        )
    }
}

const ARTICLE_PUBLISHED_TITLE = "Article published";
export class PublishingOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            phase : 1
        };
    }

    componentDidMount() {
        this.keydown_bound = this.keydown.bind(this);
        window.addEventListener('keydown', this.keydown_bound);
    }

    keydown(ev) {
        if (ev.key == "Escape") {
            this.dismiss();
        }
    }

    golive() {
        this.setState({
            goingLive : true
        }, () => {
            this.props.extra.publishFunction((status, errormessage) => {
                if (status == 200) {
                    this.props.extra.getReportFunction((err, report) => {
                        this.setState({
                            goingLive : false,
                            report : report,
                            phase : 2
                        }, () => {
                            const letters = Array.from(this.pubtitleref.querySelectorAll('span'));
                            letters.forEach((letter, i) => {
                                setTimeout(() => {
                                    letter.classList.add("shown");
                                }, i * 20);
                            });
                        })
                    })
                } else {
                    this.dismiss();
                }
            });
        })
    }

    dismiss() {
        dismissOverlay();
        window.removeEventListener('keydown', this.keydown_bound);
    }

    render() {
        return (
            <div id="confirm-publish-overlay">
                { this.state.phase == 1 ? (<div class="phase-1">
                    <div class={"confirm-publish-overlay-form " + (this.state.goingLive ? "upup" : "")}>
                        <b>You're all set!</b>
                        <div class="big-publish-button" onClick={this.golive.bind(this)}>
                            Go Live
                        </div>
                        <u>
                            <span onClick={this.dismiss.bind(this)}>
                                Cancel
                            </span>
                        </u>
                    </div>

                    <div class="spinner-pub-wrap">
                        { this.state.goingLive ? <Spinner /> : null }
                    </div>
                </div>) : null }

                { this.state.phase == 2 ? (<div class="phase-2">

                    <div class="article-published-report">
                        <b class="article-published-title" ref={r => (this.pubtitleref = r)}>
                            {ARTICLE_PUBLISHED_TITLE.split('').map(letter => (<span class={letter == " " ? "space" : "letter"}>{letter}</span>))}
                        </b>
                        <PublishedReportSlider posts={this.state.report.lastpublished} />
                        <PublishedReportDetails report={this.state.report} onDismiss={this.dismiss.bind(this)} />
                    </div>

                </div>) : null }
            </div>
        )
    }
}
