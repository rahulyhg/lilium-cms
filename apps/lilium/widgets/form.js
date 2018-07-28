import { h, Component, cloneElement } from "preact";

const styles = {
    placeholder : {
        display: "block",
        fontSize : 14,
        marginBottom: 8
    },
    fieldwrap : {
        marginBottom: 20
    },
    textfield : {
        boxSizing : "border-box",
        width : "100%",
        padding: 10,
        fontSize : 18,
        background : "#F9F9F9",
        border : "1px solid #CCC",
        borderBottomWidth : 2,
        color: "#333"
    },
    textarea : {
        resize : "none",
        height : 150
    }
}

class FormField extends Component {
    constructor(props) {
        super(props);
        this.value = props.initialValue;
    }

    changed(ev) {
        this.value = ev.target.value;
        this.props.onChange && this.props.onChange(this.props.name, ev.target.value);
    }

    get isField() { return true; }
}


const buttonThemes = {
    'success': { backgroundColor: "green" },
    'danger': { backgroundColor: "red" },
    'info': { backgroundColor: "white" },
};

export class ButtonWorker extends Component {
    constructor(props) {
        super(props);

        this.state = {
            working : false
        };
    }

    work() {
        this.setState({ working : true });
        this.props.work && this.props.work(status => {
            this.done(...arguments);
        });
    }

    done() {
        this.setState({ working : false });
        this.props.done && this.props.done();
    }

    render() {
        return (
            <div class="button-worker" style={Object.assign({}, styles.buttonworker, buttonThemes[this.props.theme] || {})} onClick={this.work.bind(this)}>
                <span class={this.state.working ? "hidden" : ""}>{this.props.text}</span>
                <div class={"working-spinner " + (this.state.working ? "shown" : "")}><i class="fa fa-spin fa-cog"></i></div>
            </div>
        )
    }
}

export class SelectField extends FormField {
    render() {
        return (
            <div style={styles.fieldwrap}>
                { this.props.placeholder ? <b style={styles.placeholder}>{this.props.placeholder}</b> : null }
                <select style={styles.textfield} value={this.value} onChange={this.changed.bind(this)}>
                    { this.props.options.map(opt => (
                        <option value={opt.value}>{opt.displayname}</option>
                    )) }
                </select>
            </div> 
        )
    }
}

export class TextField extends FormField {
    render() {
        return (
            <div style={Object.assign(styles.fieldwrap, this.props.wrapstyle || {})}>
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b style={styles.placeholder}>{this.props.placeholder}</b> : null }

                {
                    this.props.multiline ? 
                        ( <textarea placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, styles.textarea, this.props.style || {})} onChange={this.changed.bind(this)}>{this.value || ""}</textarea>) :
                        ( <input placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, this.props.style || {})} type="text" value={this.value} onChange={this.changed.bind(this)} />)
                }
            </div>
        )
    }
}
