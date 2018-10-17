import { h, Component } from "preact";
import API from '../data/api';
import flatpickr from 'flatpickr';
import { Spinner } from '../layout/loading'
import { ImagePicker } from '../layout/imagepicker';
import slugify from "slugify";

class FormField extends Component {
    constructor(props) {
        super(props);
        this.value = props.initialValue;

        this.autosave = props.autosave;

        if (this.autosave) {
            this.endpoint = props.endpoint;
            this.fieldkey = props.fieldkey || "field";
            this.valuekey = props.valuekey || "value";
            this.savemethod = props.savemethod || "post";
        }
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

        if (this.autosave) {
            this.setState({ saving : true });
            API[this.savemethod](this.endpoint, { 
                [this.fieldkey] : this.props.name, [this.valuekey] : this.value 
            }, (err, resp, r) => {
                if (err || r.status / 200 != 1) {
                    this.setState({ saving : false, saved : true });
                } else {
                    this.setState({ saving : false, saveerror : true });
                }

                setTimeout(() => {
                    this.setState({ saved : false, saveerror : false })
                }, 3000);
            })
        }
    }

    get isField() { return true; }
}

/**
 * Returns the Class of a form component appropriate to the specified type
 * @param {string} type The type of the value that needs to be represented by a form element
 */
export function fieldFromType(type) {
    switch(type) {
        case 'boolean':
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
        if (!this.state.working) {
            !this.props.sync && this.setState({ working : true });
            this.props.work && this.props.work(status => {
                this.done(...arguments);
            });
        }
    }

    done() {
        this.setState({ working : false });
        this.props.done && this.props.done();
    }

    render() {
        return (
            <div class={"button-worker " + (this.props.theme || "white") + " " + (this.props.type || "outline")} style={this.props.style || {}} onClick={this.work.bind(this)}>
                <span class={this.state.working ? "hidden" : ""}>{this.props.text}</span>
                <div class={"working-spinner " + (this.state.working ? "shown" : "")}><i class="fa fa-spin fa-cog"></i></div>
            </div>
        )
    }
}

export class SelectField extends FormField {
    render() {
        return (
            <div class="field-wrap">
                { this.props.placeholder ? <b class="placeholder">{this.props.placeholder}</b> : null }
                <select class="classic-field" value={this.value} onChange={this.changed.bind(this)}>
                    { this.props.options.map(opt => (
                        <option value={opt.value} selected={opt.value == this.props.initialValue}>{opt.displayname}</option>
                    )) }
                </select>
            </div> 
        )
    }
}

export class TextField extends FormField {
    constructor(props) {
        super(props);

        this.inputbox;
        this.keyEvents = this.props.keyEvents || {};
    }

    componentWillReceiveProps(props) {
        if (typeof props.value != 'undefined') {
            this.changed({ target : { value : props.value }});
            this.inputbox.value = props.value;
        } else {
            this.inputbox.value = '';
        }
    }

    shouldComponentUpdate(nextProps) {
        return !nextProps.value;
    }

    handleKeyPress(ev) {
        this.props.onKeyPress && this.props.onKeyPress(ev);
        
        if (ev.key == 'Enter') {
            this.props.onEnter && this.props.onEnter(ev.target.value, ev.target);
        }

        const keyEventCb = this.keyEvents[ev.keyCode] || this.keyEvents[ev.key];
        keyEventCb && keyEventCb(ev);
    }

    render() {
        return (
            <div class="field-wrap" style={this.props.wrapstyle || {}}>
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b class="placeholder">{this.props.placeholder}</b> : null }

                {
                    this.props.multiline ? 
                        ( <textarea placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} class="classic-field" style={this.props.style || {}} 
                                    onChange={this.changed.bind(this)} onKeyDown={this.handleKeyPress.bind(this)} ref={el => {this.inputbox = el}}>{this.props.initialValue || this.props.value || this.value || ""}</textarea>) :
                        ( <input placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} class="classic-field" style={Object.assign({}, this.props.style || {})} type={this.props.type || 'text'} value={this.value}
                                    onChange={this.changed.bind(this)} onKeyDown={this.handleKeyPress.bind(this)} onBlur={this.props.onBlur && this.props.onBlur.bind(this)}
                                    onFocus={this.props.onFocus && this.props.onFocus.bind(this)} ref={el => {this.inputbox = el}} />)
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

    /**
     * Moves an item 'up' in the list, decreasing its index
     * @param {number} startIndex 
     */
    moveItemUp(startIndex) {
        const values = this.state.values;
        if (startIndex > 0 && startIndex <= this.state.values.length - 1) {
            values.splice(startIndex - 1, 0, values.splice(startIndex, 1)[0]);
            this.setState({ values });
            this.onChange();
        }
    }

    /**
     * Moves an item 'down' in the list, increasing its index
     * @param {number} startIndex 
     */
    moveItemDown(startIndex) {
        const values = this.state.values;
        if (startIndex >= 0 && startIndex <= this.state.values.length - 2) {
            values.splice(startIndex + 1, 0, values.splice(startIndex, 1)[0]);
            this.setState({ values });
            this.onChange();
        }
    }

    removeOne(index) {
        let values = [...this.state.values];
        values.splice(index, 1);

        this.setState({ values }, () => {
            this.onChange();
        });
    }

    render() {
        return (
            <div class="stack-box">
                <b class="placeholder">{this.props.placeholder || ""}</b>
                <div class="stack-box-list">
                    {
                        this.state.values.map((value, index) => (
                            <StackBox.StackField onDelete={this.removeOne.bind(this, index)} onChange={this.textEdited.bind(this)} key={slugify(value)}
                                                index={index} lastInList={index == this.state.values.length - 1} initialValue={value}
                                                moveItemDown={this.moveItemDown.bind(this)} moveItemUp={this.moveItemUp.bind(this)} />
                        ))
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

    moveUp() {
        this.props.moveItemUp(this.props.index);
    }

    moveDown() {
        this.props.moveItemDown(this.props.index);
    }

    render() {
        return (
            <div style={{ display : "flex" }}>
                <div onClick={this.selfdestruct.bind(this)} class="stackboxex"><i class="far fa-times"></i></div>
                {
                    (this.props.index != 0) ? (
                        <div onClick={this.moveUp.bind(this)} class="stackboxex"><i className="fal fa-chevron-up"></i></div>) : ( null )
                }
                {
                    (!this.props.lastInList) ? (
                        <div onClick={this.moveDown.bind(this)} class="stackboxex"><i className="fal fa-chevron-down"></i></div>) : ( null )
                }
                <TextField onChange={this.onChange.bind(this)} wrapstyle={{ marginBottom: 0, flexGrow : 1 }} style={{borderBottom : 'none'}} initialValue={this.props.initialValue} />
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
        const oldValue = this.value;

        if (this.value != ev.target.value) {
            this.value = ev.target.value;
            this.props.onChange && this.props.onChange(this.props.name, ev.target.value, oldValue);
        }
  
        this.setState({ editing: false });
    }

    render() {
        return (
            <div class="field-wrap" style={this.props.wrapstyle || {}}>
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b class="placeholder">{this.props.placeholder}</b> : null }
                {
                    this.state.editing ?
                        (this.props.multiline ? 
                            ( <textarea placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""}
                                    class="classic-field" style={this.props.style || {}}
                                    onBlur={this.handleBlur.bind(this)} ref={x => (this.textInput = x)}>{this.value || ""}</textarea>) :
                            ( <input placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""}
                                    class="classic-field" style={Object.assign({}, this.props.style || {})} type={this.props.type || 'text'} value={this.value}
                                    onBlur={this.handleBlur.bind(this)} ref={x => (this.textInput = x)} />))
                        : ( <p onClick={() => { this.setState({ editing: true }, () => { this.textInput.focus(); }); }}
                                title='Click to edit' style={{ cursor: 'text', hover: { border:'1px solid #333' } }}>{this.value}</p> )
                }
            </div>
        )
    }
}

export class MediaPickerField extends FormField {
    constructor(props) {
        super(props);
        this.state.mediaID = props.mediaID || props.initialValue;
        this.state.mediaURL = props.mediaURL;
        this.state.size = props.size || "full";
    }

    extractImageFromResponse(image) {
        switch (this.state.size) {
            case "small": return image.sizes.square.url;
            default: return image.sizes.facebook.url;
        }
    }

    componentDidMount() {
        if (this.state.mediaID && !this.state.mediaURL) {
            API.get("/uploads/single/" + this.state.mediaID, {}, (err, upload) => {
                upload && this.setState({ mediaURL : this.extractImageFromResponse(upload) })
            });
        }
    }

    open() {
        ImagePicker.cast({
            selected : this.state.mediaID || undefined
        }, image => {
            if (image) {
                this.changed({
                    target : {
                        name : this.props.name, 
                        value : image,
                        
                        oldValue : this.state.mediaURL
                    }
                });

                this.setState({ mediaURL : this.extractImageFromResponse(image), mediaID : image._id });
            }
        });
    }

    render() {
        return (
            <div class="image-field-wrap">
                {
                    <b>{this.props.placeholder || "Select an image"}</b>
                }
                {
                    this.state.mediaURL ? (
                        <div class={"media-picker-field-image-wrap " + this.state.size} onClick={this.open.bind(this)} style={this.props.style || {}}>
                            <img src={this.state.mediaURL} style={this.props.imagestyle || {}} />
                        </div>
                    ) : (
                        <div class={"media-picker-field-image-wrap " + this.state.size} onClick={this.open.bind(this)} style={this.props.style || {}}>
                            <b>{this.props.textoverlay || "Click here to pick an image"}</b>
                        </div>
                    )
                }
            </div>
        )
    }
}

export class TopicPicker extends FormField {
    static TopicSlide = class TopicSlide extends Component {
        constructor(props) {
            super(props);
            this.state = {
                topics: props.topics,
                selectedIndex : -1
            }
        }

        componentWillReceiveProps(props) {
            this.setState({ 
                topics : props.topics
            });
        }

        selectOne(topic, index) {
            this.props.onSelect(topic, this.props.index);
            this.setState({
                selectedIndex : index
            })
        }

        addOne(topic) {
            this.props.onAdd && this.props.onAdd(topic);
        }

        render() {
            return (
                <div class="topic-children-slide">
                    { this.state.topics.map((topic, index) => (
                        <div class={"topic-children-item " + (index == this.state.selectedIndex ? "selected" : "")} onClick={this.selectOne.bind(this, topic, index)}>
                            {topic.displayname}
                        </div>
                    )) }

                    {
                        this.props.session == "manager" ? (
                            <div class="topic-children-item add-new" onClick={this.addOne.bind(this)}>
                                <i class="far fa-plus"></i>
                            </div>
                        ) : null
                    }
                </div>
            )
        }
    }

    constructor(props) {
        super(props);
        this.state.loading = true;
        this.state.topics = [];
        this.state.phase = "loading"
        this.state.stagedtopic;
    }

    refreshCategories() {
        log('Topics', 'Getting categories from server', 'info');

        API.get('/topics/category', {}, (err, categories) => {
            this.setState({
                phase : "category", 
                categories
            })
        });
    }

    lockTopicFromID(id) {
        log('Topics', 'Locked topic with ID ' + id, 'info');

        API.get('/topics/get/' + this.props.initialValue, {}, (err, topic) => {
            this.setState({
                phase : "lock",
                selectedTopic : topic,
                stagedtopic : topic
            });
        });
    }

    loadCategoryChildren(category) {
        log('Topics', 'Loading children topic from category ' + category, 'info');
        API.get('/topics/ofcategory/' + category, {}, (err, topics) => {
            this.setState({
                phase : "tree",
                topics : [topics]
            });
        });        
    }

    loadChildrenTopicsFrom(topic, index) {
        log('Topics', 'Loading children topic from topic ' + topic.displayname + ' at index ' + index, 'info');
        API.get('/topics/childof/' + topic._id, {}, (err, children) => {
            const newArray = [...this.state.topics.splice(0, index + 1), children];
            this.setState({
                phase : "tree",
                topics : newArray,
                stagedtopic : topic
            });

            this.changed({
                target : {
                    name : this.props.name, 
                    value : topic
                }
            });
        });
    }

    componentDidMount() {
        if (this.props.initialValue) {
            this.lockTopicFromID(this.props.initialValue);
        } else {
            this.refreshCategories();
        }
    }

    reset() {
        this.setState({
            loading: true,
            phase : "loading", 
            topics : [],
            selectedTopic : undefined,
            stagedtopic : undefined
        }, () => {
            this.refreshCategories();
        })
    }

    lockin() {
        this.setState({
            phase : "lock"
        })
    }

    addOne(topic) {
        this.props.onAdd && this.props.onAdd(topic);
    }

    getCurrentSelectedSlug() {
        if (this.state.stagedtopic && this.state.phase != "lock") {
            return (<div class="topic-picker-current">
                <b>{this.state.stagedtopic.displayname}</b> <i>/{this.state.stagedtopic.completeSlug}</i>
            </div>);
        } else {
            return null;
        }
    }

    renderPickerSection() {
        switch (this.state.phase) {
            case "loading": return (
                <div class="phase-loading">
                    <Spinner />
                </div>
            )

            case "category": return (
                <div class="phase-category">
                    <b>Choose a category</b>
                    <div class="category-picker-wrap">
                    {
                        this.state.categories.map(category => (
                            <div class="category-bubble" onClick={this.loadCategoryChildren.bind(this, category)}>
                                {category}
                            </div>
                        ))
                    }
                    </div>
                </div>
            )

            case "tree": return (
                <div class="phase-tree">
                    {
                        this.state.topics.map((topicchildren, index) => (
                            <TopicPicker.TopicSlide onAdd={this.addOne.bind(this)} session={this.props.session} 
                                topics={topicchildren} onSelect={this.loadChildrenTopicsFrom.bind(this)} 
                                index={index} />
                        ))
                    }
                </div>
            )

            case "lock": return (
                <div class="phase-lock">
                    <b>Selected topic</b>
                    <div class="selected-topic-displayname">{this.state.stagedtopic.displayname}</div>
                    <i class="selected-topic-slug">/{this.state.stagedtopic.completeSlug}</i>
                </div>
            )

            default: return (
                <div class="phase-error">
                    Error
                </div>
            )
        }
    }

    getFooter() {
        return (
            <footer>
                <span class="red clickable" onClick={this.reset.bind(this)}>Reset</span>
                { this.state.stagedtopic && this.props.session != "manager" ? (
                    <span class="clickable" onClick={this.lockin.bind(this)}><b>Lock in</b></span>
                ) : null }
            </footer>
        );
    }

    render() {
        return (
            <div class="topic-picker card">
                <div class="topic-picker-picking-section">
                    {this.renderPickerSection()}
                </div>

                {this.getCurrentSelectedSlug()}
                {this.getFooter()}
            </div>
        )
    }
}

export class DatePicker extends FormField {
    constructor(props) {
        super(props);
    }

    shouldComponentUpdate() { return false; }
    componentWillUnmount() { this.picker && this.picker.destroy(); }

    componentDidMount() {
        this.picker = flatpickr(this.input, this.props.flatpickr || {
            enableTime : typeof this.props.enabletime == "undefined" ? true : this.props.enabletime,
            dateFormat : this.props.dateformat || "Y-m-d H:i",
            defaultDate : new Date(this.value) || new Date(),
            onChange : dateArr => {
                const [value] = dateArr;
                const oldValue = this.value;

                this.changed({
                    target : {
                        name : this.props.name, value, oldValue
                    }
                });        
            }
        });
    }

    render() {
        return (
            <div style={this.props.wrapstyle || {}}>
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b class="placeholder">{this.props.placeholder}</b> : null }
                
                <input ref={i => (this.input = i)} placeholder={this.props.placeholderType == "inside" ? this.props.placeholder : ""} style={Object.assign({}, this.props.style || {})} class="classic-field" />
            </div>
        )
    }
}

export class CheckboxField extends FormField {
    constructor(props) {
        super(props);

        this.value = !!props.initialValue;
        this.state = { checked: this.value };
    }

    onChange() {
        this.value = !this.value;
        this.setState({ checked: this.value }, () => {
            this.changed({
                target : {
                    name : this.props.name, value : this.state.checked
                }
            });
        });
    }

    render() {
        return (
            <div className="checkbox-field-wrapper">
                <b className="checkbox-text placeholder" onClick={this.onChange.bind(this)}>{this.props.placeholder}</b>
                <hr  />
                <div className={"checkbox-wrapper " + (this.state.checked ? "checked" : "")} onClick={this.onChange.bind(this)}>
                    <span className="checkmark">{(this.state.checked) ? (<i className="fa fa-check"></i>) : null}</span>
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
            <div className="tag">
                <span className="tag-text">{this.props.text}</span>
                {
                    (!this.props.readOnly) ? (
                        <i className="fal fa-times close-button"
                            onClick={this.props.remove && this.props.remove.bind(this, this.props.text)}></i>
                    ) : null
                }
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
                { this.props.placeholder && this.props.placeholderType != "inside" ? <b class="placeholder">{this.props.placeholder}</b> : null }
                <div class="classic-field faux" onClick={this.focusInput.bind(this)}>
                    {
                        this.state.tags.map(tag => {
                            return (
                                <Tag text={tag} key={tag} remove={this.removeTag.bind(this)} />
                            );
                        })
                    }

                    <input class="invisible-input" type="text" ref={x => (this.textInput = x)} onKeyDown={this.onKeyDown.bind(this)}
                            placeholder={(this.props.placeholderType == 'inside' ) ? this.props.placeholder : ''} />
                </div>
            </div>
        );
    }
}

class ListItem extends Component {
    constructor(props) {
        super(props);

        this.state = { selected: this.props.selected || false };
    }

    componentWillReceiveProps(props) {
        this.setState({ selected: props.selected });
    }

    render() {
        if (this.state.selected) {
            return (
                <div className="list-item selected" onClick={this.props.unselectOption.bind(this, this.props.option.value)}>
                    <span>{this.props.option.displayName}</span>
                </div>
            );
        } else {
            return (
                <div className="list-item" onClick={this.props.selectOption.bind(this, this.props.option.value)}>
                    <span>{this.props.option.displayName}</span>
                </div>
            );
        }
    }
}

export class MultiSelectBox extends FormField {
    constructor(props) {
        super(props);

        this.state = {
            options: this.formatOptions() || [],
            selectedValues: this.props.initialValue || []
        };
    }

    /**
     * If options provided via the 'options' prop consist of a string array e.g. ['option1', ...]
     * this function returns an object array formatted like e.g. [{ displayName: 'option1 , value: 'option1'}]
     */
    formatOptions() {
        return this.props.options.map(opt => { return (typeof opt == 'object') ? opt : { displayName: opt, value: opt } });
    }

    selectOption(val) {
        const selectedValues = [...this.state.selectedValues];
        selectedValues.push(val);
        this.setState({ selectedValues });
        this.changed();
    }

    unselectOption(val) {
        const selectedValues = this.state.selectedValues;
        this.setState({ selectedValues: selectedValues.filter(v => v != val) });
        this.changed();
    }

    changed() {
        this.props.onChange && this.props.onChange(this.props.name, this.state.selectedValues);
    }

    render() {
        return (
            <div className="multiselectbox-wrapper">
                <b class="placeholder">{this.props.placeholder}</b>
                <div className="selectedoptions-wrapper">
                    {
                        (this.state.selectedValues.length > 0) ? (
                            this.state.selectedValues.map(value => {
                                const option = this.state.options.find(o => o.value == value) || {};
                                return (<Tag text={option.displayName} key={value} readonly={true} />)
                            })
                        ) : (
                            <p style={{margin: 8, color: '#555'}}>No values selected</p>
                        )
                    }
                </div>
                <div className="multiselectbox-options-list">
                    {
                        this.state.options.map(option => {
                            return (
                                <ListItem option={option} selected={this.state.selectedValues.includes(option.value)} key={option.value}
                                        unselectOption={this.unselectOption.bind(this)} selectOption={this.selectOption.bind(this)} />
                            )
                        })
                    }
                </div>
            </div>
        );
    }
}

export class DebouncedField extends FormField {
    constructor(props) {
        super(props);
        // Debounce delay in ms
        this.debounceDelay = this.props.debounceDelay || 300;
        this.timeoutId;
        this.oldValue = "";
    }

    shouldComponentUpdate() { return false; }

    debounceInput(ev) {
        this.timeoutId && clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => {
            if (this.oldValue != ev.target.value) {
                this.props.onDebounce && this.props.onDebounce(ev.target.value)
            }
         
            this.oldValue = ev.target.value;
        }, this.debounceDelay);
    }

    render() {
        return (
            <TextField placeholder={this.props.placeholder} onKeyPress={this.debounceInput.bind(this)} onBlur={this.props.onBlur && this.props.onBlur.bind(this)}
                        onFocus={this.props.onFocus && this.props.onFocus.bind(this)} keyEvents={this.props.keyEvents} />
        );
    }
}

export class AutocompleteField extends Component {
    constructor(props) {
        super(props);
        this.state = { items: [] };
    }

    searchEndpoint(searchString) {
        if (!this.props.endpoint) throw new Error('Must specify an endpoint for AutocompleteField')

        // The endpoint is expected to return an array
        API.get(this.props.endpoint, { query: searchString }, (err, data, r) => {
            if (r.status == 200) {
                this.setState({ items: data, dropdownShown: !!data.length });
            } else {
                log('AutocompleteField', `Failes fetching the specified endpoint ${this.props.endpoint}`, 'error');
            }
        });
    }

    getKeyBindings() {
        return {
            "27": this.onEscapePressed.bind(this)
        }
    }

    onEscapePressed(ev) {
        this.closeDropdown();
    }

    closeDropdown() {
        this.setState({ dropdownShown: false });
    }

    showDropdown() {
        this.setState({ dropdownShown: !!this.state.items.length });
    }

    selectItem(item) {
        this.setState({ selectedValue: item[this.props.autocompleteField] });
        this.props.valueSelected && this.props.valueSelected(item);
    }

    render() {
        return (
            <div className="autocomplete-field">
                <DebouncedField placeholder={this.props.placeholder} placeholderType='inside' onFocus={this.showDropdown.bind(this)}
                                onDebounce={this.searchEndpoint.bind(this)} onBlur={this.closeDropdown.bind(this)} keyEvents={this.getKeyBindings()} />
                {
                    (this.state.dropdownShown) ? (
                        <div className="autocomplete-choices">
                            {
                                this.state.items.map((item, index) => {
                                    const displayField = item[this.props.autocompleteField];

                                    // h4 uses onMouseDown because the onBlur event of the DebouncedField prevents onClick from firing
                                    return (<h4 className={`autocomplete-choice ${displayField == this.state.selectedValue ? 'selected' : ''}`} key={index}
                                            onMouseDown={this.selectItem.bind(this, item)}>{displayField}</h4>);
                                })
                            }
                        </div>
                    ) : (null)
                }
            </div>
        );
    }
}
