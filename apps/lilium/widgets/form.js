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
        color: "#333",
        outlineColor: "#c47ed4"
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

    componentWillReceiveProps(props) {
        if (typeof props.initialValue != "undefined") {
            this.value = props.initialValue;
            this.setState({ initialValue : props.initialValue });
        }
    }

    changed(ev) {
        const oldValue = this.value;
        this.value = this.props.format ? this.props.format(ev.target.value) : ev.target.value;
        this.props.onChange && this.props.onChange(this.props.name, this.value, oldValue);
    }

    get isField() { return true; }
}


const buttonThemes = {
    'success': { backgroundColor: "green", borderColor : "#0c3c0c" },
    'danger':  { backgroundColor: "red"  , borderColor : "#3c0c0c" },
    'info':    { backgroundColor: "white", borderColor : "#DDDDDD" },
};

export class ButtonWorker extends Component {
    constructor(props) {
        super(props);

        this.state = {
            working : false
        };
    }

    work() {
        !this.props.sync && this.setState({ working : true });
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
    handleKeyPress(ev) {
        this.props.onKeyPress && this.props.onKeyPress(ev);

        if (ev.key == 'Enter') {
            this.props.onEnter && this.props.onEnter(ev.target.value, ev.target);
        }
    }

    render() {
        return (
            <div style={Object.assign({}, styles.fieldwrap, this.props.wrapstyle || {})}>
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b style={styles.placeholder}>{this.props.placeholder}</b> : null }

                {
                    this.props.multiline ? 
                        ( <textarea placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, styles.textarea, this.props.style || {})} 
                                    onChange={this.changed.bind(this)} onKeyPress={this.handleKeyPress.bind(this)}>{this.value || ""}</textarea>) :
                        ( <input placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, this.props.style || {})} type={this.props.type || 'text'} value={this.value}
                                    onChange={this.changed.bind(this)} onKeyPress={this.handleKeyPress.bind(this)} />)
                }
            </div>
        )
    }
}


export class EditableText extends FormField {

    constructor(props) {
        super(props);

        this.state.editing = false;
    }

    handleBlur(ev) {
        log('EditableText', 'BLUR', 'success');
        const oldValue = this.value;
        
        if (this.value != oldValue) {
            this.value = ev.target.value;
            this.props.onChange && this.props.onChange(this.props.name, ev.target.value, oldValue);
        }
  
        this.setState({ editing: false });
    }

    render() {
        log('EditableText', 'RENDER', 'success');
        return (
            <div style={Object.assign({}, styles.fieldwrap, this.props.wrapstyle || {})}>
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b style={styles.placeholder}>{this.props.placeholder}</b> : null }

                {
                    this.state.editing ?
                        (this.props.multiline ? 
                            ( <textarea placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, styles.textarea, this.props.style || {})} onBlur={this.handleBlur.bind(this)}>{this.value || ""}</textarea>) :
                            ( <input placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, this.props.style || {})} type={this.props.type || 'text'} value={this.value} onBlur={this.handleBlur.bind(this)} />))
                        : ( <p onClick={() => { this.setState({ editing: true }) }}>{this.value}</p> )
                }
            </div>
        )
    }
}
