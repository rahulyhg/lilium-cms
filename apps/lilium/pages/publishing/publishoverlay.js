import { h, Component } from 'preact';

import { Spinner } from '../../layout/loading';
import API from '../../data/api';
import { getSession } from '../../data/cache';
import { dismissOverlay } from '../../overlay/overlaywrap';
import dateformat from 'dateformat';
import { AnimeNumber } from '../../widgets/animenumber';

class PublishedReportDetails extends Component {
    constructor(props) {
        super(props);

        this.state = {
            websitetotal : this.props.report.websitetotal - 1
        }
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({
                websitetotal : this.state.websitetotal + 1
            });
        }, 2000);
    }

    render() {
        return (
            <div class="full-pub-report">
                <div class="card">
                    <AnimeNumber number={this.state.websitetotal} />
                    <div class="pub-report-title">articles on the website</div>
                </div>
            </div>
        )
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
        return this.state.visible ? (
            <div style={{ width : PUBLISHED_CARD_CONST_WIDTH }} class={ "card publish-report-card " + (this.state.last ? "last " : " ") }>
                <a class="image-wrapper" href={"/" + this.props.post.topicslug + "/" + this.props.post.name} target="_blank">
                    <img class="pub-report-card-facebookmedia" src={this.props.post.facebookmedia} />

                </a>
                <div class="pub-report-card-headline">{this.props.post.headline}</div>
                <div class="pub-report-card-subline">{this.props.post.subline}</div>

                <footer>
                    {dateformat(new Date(this.props.post.date), 'mmmm dd, HH:MM')} | {this.props.author.displayname}
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
                        <PublishedReportDetails report={this.state.report} />
                    </div>

                </div>) : null }
            </div>
        )
    }
}