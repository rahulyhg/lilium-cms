import { h, Component } from 'preact';

import { Spinner } from '../../layout/loading';
import API from '../../data/api';
import { navigateTo } from '../../routing/link';
import { castNotification } from '../../layout/notifications';
import { dismissOverlay } from '../../overlay/overlaywrap';

const styles = {
    overlay : {
        position: "fixed",
        top: "calc(50% - 100px)",
        width : "calc(100% - 300px)",
        left: 180,
        zIndex : 20,
    },
    title : {
        color: "#ba8ac3",
        fontFamily: "'Oswald', sans-serif",
        textTransform: "uppercase",
        fontWeight: 100,
        fontSize: 72,
        letterSpacing : -2,
        marginBottom : -10
    },
    textbox : {
        background: "transparent",
        color : "#f5cbff",
        fontSize : 30,
        border : "none",
        outline : "none",
        width : "100%"
    },
    button : {
        marginRight : 12,
        color : "rgb(218, 115, 199)",
        cursor : "pointer",
        textDecoration : 'underline'
    }
}

export class CreateOverlay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading : false
        };
    }

    componentDidMount() {
        this.textbox.focus();
    }

    submit(headline) {
        this.setState({ loading : true });
        if (headline) {
            API.post("/publishing/new", { headline }, (err, resp) => {
                if (resp && resp._id) {
                    navigateTo("/publishing/write/" + resp._id);
                } else {
                    castNotification({
                        type : "error",
                        title : "Could not create article",
                        message : "The article could not be created because of a server error."
                    });
                    this.setState({ loading : false });
                }
            });
        } else {
            this.setState({ loading : false });
            castNotification({
                type : "warning",
                title : "Missing title",
                message : "An article needs a title before it can be created."
            });
        }
    }

    submitText() {
        this.submit(this.textbox.value);
    }

    keydown(ev) {
        if (ev.key == 'Enter') {
            this.submit(ev.target.value.trim());
        } else if (ev.key == "Escape") {
            dismissOverlay();
        }
    }

    dismiss() {
        dismissOverlay();
    }

    render() {
        return (
            <div id="create-article-overlay">
                <div style={ styles.overlay }>
                    {
                        this.state.loading ? (
                            <Spinner />
                        ) : (
                            <div>
                                <div style={ styles.title }>Create a new post</div>
                                <input onKeyDown={this.keydown.bind(this)} class="pink-placeholder" ref={x => (this.textbox = x)} style={ styles.textbox } placeholder="Provide a title, and press Enter"  />
                                <div style={{ marginTop : 50 }}>
                                    <b style={styles.button} class="" onClick={this.submitText.bind(this)}>Create article</b>
                                    <b style={styles.button} onClick={this.dismiss.bind(this)}>Dismiss</b>
                                </div>
                            </div>
                        )
                    }
                </div>
                <div class="create-article-bg"></div>
                <div class="create-article-left-strip"></div>
                <div class="create-article-right-strip"></div>
            </div>
        )
    }
}