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
    stackboxsingles : {
        marginBottom : 0,
        flexGrow : 1
    },
    stackboxex : {
        width: 40, height : 40,    
        background: "#f5b1b1",
        color: "white",
        boxSizing: "border-box",
        fontSize: 32,
        textAlign: "center",
        cursor: "pointer"
    },
    textarea : {
        resize : "none",
        height : 150
    },
    checkboxWrapper: {
        cursor: 'pointer',
        border: '1px solid #2d2d2d',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        height: '25px',
        width: '25px',
        margin: '12px 12px 12px 20px',
        flex: '0 0 25px',
        flexWrap: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        marginLeft: 'auto'
    },
    checkboxChecked: {
        backgroundColor: '#af57e4',
        borderStyle: 'dashed'
    },
    checkboxFieldWrapper: {
        display: 'flex',
        alignItems: 'center',
    },
    checkboxCheckmark: {
        color: 'white',
        padding: '0px',
        margin: '0px',
    },
    fauxTextField: {
        cursor: 'text',
        height: '40px',
        display: 'flex',
        padding: '2px'
    },
    tag: {
        closeButton: {
            margin: '2px 2px 2px 6px',
            cursor: 'pointer',
            hover: {
                fontWeight: 'bolder',
            }
        },
        cursor: 'default',
        backgroundColor: '#af57e4',
        color: 'white',
        margin: '4px 8px',
        padding: '2px 6px',
        display: 'flex',
        alignContent: 'center',
        fontWeight: 'bold'
    },
    invisibleInput: {
        border: '0',
        backgroundColor: 'transparent',
        outline: 'none',
        margin: '4px 8px',
        lineHeight: '20px'
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
    'success': { backgroundColor: "green",   borderColor : "#0c3c0c" },
    'danger':  { backgroundColor: "#fb3e3b", borderColor : "rgb(187, 65, 65)" },
    'white':   { backgroundColor: "white",   borderColor : "#DDD", color : "#333" },
};

/**
 * Returns the Class of a form component appropriate to the specified type
 * @param {string} type The type of the value that needs to be represented by a form element
 */
export function fieldFromType(type) {
    switch(type) {
        case 'boolean':
            alert('Checkbox!');
            return CheckboxField;
        case 'object':
            return SelectField;
        default:
            return TextField;
    }
}

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
            <div class="button-worker" style={Object.assign({}, styles.buttonworker, buttonThemes[this.props.theme] || {}, this.props.style || {})} onClick={this.work.bind(this)}>
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
                        <option value={opt.value} selected={opt.value == this.props.initialValue}>{opt.displayname}</option>
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
                                    onChange={this.changed.bind(this)} onKeyDown={this.handleKeyPress.bind(this)}>{this.value || ""}</textarea>) :
                        ( <input placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, styles.textfield, this.props.style || {})} type={this.props.type || 'text'} value={this.value}
                                    onChange={this.changed.bind(this)} onKeyDown={this.handleKeyPress.bind(this)} />)
                }
            </div>
        )
    }
}

export class StackBox extends FormField {
    constructor(props) {
        super(props);
        this.state = {
            values : Array.from(this.value || [])
        };
    }

    onChange() {
        this.changed({
            target : {
                value : this.state.values
            }
        });
    }

    appendFromBox(text) {
        this.setState({ values : [...this.state.values, text] }, () => {
            this.onChange();
        });
    }

    textEdited(index, value) {
        const newValues = [...this.state.values];
        newValues[index] = value;
        this.setState({ values : newValues }, () => {
            this.onChange();
        });
    }

    handleInputBoxKeyPress(ev) {
        if (ev.key == 'Enter' && ev.target.value.trim()) {
            const value = ev.target.value.trim();
            ev.target.value = "";
            this.appendFromBox(value);
        }
    }

    removeOne(index) {
        let values = [...this.state.values];
        if (index == 0) {
            values.shift();
        } else if (index == values.length - 1) {
            values.pop();
        } else {
            values = [...values.splice(0, index), ...values.splice(1)];
        }

        this.setState({ values }, () => {
            this.onChange();
        });
    }

    render() {
        return (
            <div class="stack-box">
                <b style={styles.placeholder}>{this.props.placeholder || ""}</b>
                <div class="stack-box-list">
                    {
                        this.state.values.map((value, i) => (<StackBox.StackField onDelete={this.removeOne.bind(this, i)} onChange={this.textEdited.bind(this)} index={i} initialValue={value} />))
                    }
                </div>
                <div>
                    <TextField onKeyPress={this.handleInputBoxKeyPress.bind(this)} placeholderType="inside" placeholder="Provide a value and press Enter" />
                </div>
            </div>
        )
    }
}

StackBox.StackField = class StackField extends Component {
    constructor(props) {
        super(props);
    }

    onChange(name, value) {
        this.props.onChange(this.props.index, value);
    }

    selfdestruct() {
        this.props.onDelete(this.props.index);
    }

    render() {
        return (
            <div style={{ display : "flex" }}>
                <div onClick={this.selfdestruct.bind(this)} style={styles.stackboxex}><i class="far fa-times"></i></div>
                <TextField onChange={this.onChange.bind(this)} wrapstyle={styles.stackboxsingles} style={{borderBottom : 'none'}} initialValue={this.props.initialValue} />
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

export class CheckboxField extends FormField {
    constructor(props) {
        super(props);

        this.state = { checked: !!this.props.initialValue };
    }

    changed(ev) {
        this.value = !this.value;
        this.setState({ checked: this.value }, () => {
            this.props.onChange && this.props.onChange(this.props.name, this.state.checked);
        });
    }

    render() {
        return (
            <div className="checkbow-field-wrapper" style={styles.checkboxFieldWrapper}>
                <b className="checkbox-text" style={styles.placeholder}>{this.props.placeholder}</b>
                <div className="checkbox-wrapper" onClick={this.changed.bind(this)}
                        style={Object.assign({}, styles.checkboxWrapper, (this.state.checked) ? styles.checkboxChecked : {})}>
                    <span className="checkmark" style={styles.checkbox}>{(this.state.checked) ? (<i className="fa fa-check"></i>) : null}</span>
                </div>
            </div>
        );
    }
}

class Tag extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="tags" style={styles.tag}>
                <span className="tag-text">{this.props.text}</span>
                <i className="fal fa-times" style={styles.tag.closeButton} onClick={this.props.remove.bind(this, this.props.text)}></i>
            </div>
        );
    }
}

export class MultitagBox extends FormField {
    constructor(props) {
        super(props);

        this.state = { tags: this.value || [] }
    }

    pushTag(text) {
        const tags = this.state.tags;
        if (!tags.includes(text)) {
            tags.push(text);
            this.setState({ tags });
            
            this.changed();
        } else {
            log('MultitagBox', 'MultitagBox will not add a duplicate tag', 'warn');
        }
    }

    removeTag(key) {
        const tags = this.state.tags.filter(tag => tag != key);
        this.setState({ tags });

        this.changed();
    }

    popTag() {
        const tags = this.state.tags;
        tags.pop();
        this.setState({ tags });

        this.changed();
    }

    changed() {
        this.props.onChange && this.props.onChange(this.props.name, this.state.tags);
    }

    onKeyDown(ev) {
        this.isEmpty = !ev.target.value;

        if (ev.which == 13 || ev.keyCode == 13) {
            this.pushTag(ev.target.value);
            ev.target.value = '';
            this.isEmpty = true;
        } else if (ev.which == 8 || ev.keyCode == 8) {
            this.isEmpty && this.popTag();
        }
    }

    focusInput() {
        this.textInput.focus();
    }

    render() {
        return (
            <div className="multilang-box-wrapper">
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b style={styles.placeholder}>{this.props.placeholder}</b> : null }
                <div className="textfield" style={Object.assign({}, styles.textfield, styles.fauxTextField)} onClick={this.focusInput.bind(this)}>
                    {
                        this.state.tags.map(tag => {
                            return (
                                <Tag text={tag} key={tag} remove={this.removeTag.bind(this)} />
                            );
                        })
                    }

                    <input type="text" ref={x => (this.textInput = x)} style={styles.invisibleInput} onKeyDown={this.onKeyDown.bind(this)}
                            placeholder={(this.props.placeholderType == 'inside' ) ? this.props.placeholder : ''} />
                </div>
            </div>
        );
    }
}
