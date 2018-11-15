import { h, Component } from 'preact';
import API from '../data/api'
import { storeLocal, getLocal } from '../data/cache';

const LOCALSTORAGE_PREFIX = "LF_";

/**
 * BigList 
 * 
 * Will make async calls to Live Variable endpoints. The list will expect an endpoint, and a Component which will be used as a list item. 
 * The Livevar endpoint can, but doesn't have to, handle the "limit" and "skip" params so that the list can lazy load on scroll. Those params
 * are typically handled by the livevar as a $limit : max and $skip : max * page mongo query param.
 * 
 * Props : {
 *      // Basic props
 *      endpoint : "/someEndpoint/with/levels/or/not",
 *      listitem : ComponentClass (the actual class, not a JSX element),
 *      batchsize : Number, representing the "max" param, defaults to 30,
 * 
 *      // More custom stuff
 *      livevarkey : Key of the server response, defaults to "item". If the server response is : { posts : [...] }, then livevarkey should be "posts",
 *      prepend : Wether the additional items will be added at the start or end of list. Setting this to "true" will add items at start of list,
 *      action : A function passed to every list item to link the BigList parent with the items through a callback,
 *      items : Array of initial items. Can be set later. If passed after mount, will replace the entire array with the new one.
 *      topElement : Component above all list items, displayed under the filters.
 *      loadmoreButton : A component representing the load more button inside the list,
 *      keyid : List item key for Preact mapping. Defaults to : _id.
 *      addComponent : First component to appear in the big list. Can be used as a "add" handle.
 *      emptyComponent : Shown when no list items are available.
 *      liststyle : Style of the inner container wrapping the list items.
 * }
 */
export class BigList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            items : props.items || [],
            ready : false
        };

        this.coldState = {
            endpoint : props.endpoint,
            component : props.listitem,
            addComponent : props.addComponent || BigListNullComponent,
            topElement : props.topElement,
            emptyComponent : props.emptyComponent || BigListEmptyTemplate,
            index : 0,
            batchsize : props.batchsize || 30,
            livevarkey : typeof props.livevarkey == "undefined" ? "items" : props.livevarkey,
            prepend : props.prepend || false,
            filters : {},
            action : props.action || function() {},
            loadmoreButton : props.loadmoreButton || undefined,
            toolbarConfig : props.toolbar || undefined
        }

        if (props.toolbar && props.toolbar.id) {
            this.coldState.filters = getLocal(LOCALSTORAGE_PREFIX + props.toolbar.id) || {};
        }
    }

    loadMore(overwrite) {
        if (overwrite) {
            this.coldState.index = 0;
        }

        API.get(this.coldState.endpoint, {
            limit : this.coldState.batchsize,
            skip : this.coldState.index * this.coldState.batchsize,
            filters : this.coldState.filters
        }, (err, list) => {
            if (err) {
                log('BigList', "Could not add items in big list because of response error : " + err, "warning")
            } else {
                if (overwrite) {      
                    log("BigList", "Overwritten items of a big list from live variable endpoint", "success");
                    const items = [...(this.coldState.livevarkey ? list[this.coldState.livevarkey] : list)];
                    this.coldState.index = 1;
                    this.setState({ items, ready : true });
                } else {                
                    log("BigList", "Added values in a big list from live variable endpoint", "success");
                    const items = [...this.state.items];
                    items[this.coldState.prepend ? "unshift" : "push"](...(this.coldState.livevarkey ? list[this.coldState.livevarkey] : list));

                    this.coldState.index++;
                    this.setState({ items, ready : true });
                }
            }
        });
    }

    toolbarFieldChanged(name, value) {
        this.coldState.filters = Object.assign(this.coldState.filters || {}, { [name] : value });
        this.loadMore(true);
    }

    componentDidMount() {
        this.loadMore(true);        
    }

    componentWillReceiveProps(props) {
        const newState = {
            endpoint  : props.endpoint  || this.coldState.endpoint,
            component : props.listitem  || this.coldState.component,
            batchsize : props.batchsize || this.coldState.batchsize,
            index : 0
        };

        Object.assign(this.coldState, newState);

        log('BigList', 'Received props, about to reload list content', 'detail');
        if (props.items) {
            const items = [...props.items];
            this.setState({ items });
        } else {
            this.loadMore(true);
        }
    }

    render() {
        if (!this.state.ready) {
            return null;
        }

        log('BigList', 'Rendering a big list with ' + this.state.items.length + ' items', 'detail');
        return (
            <div class="big-list">
                {
                    this.coldState.toolbarConfig ? (
                        <BigListToolBar 
                            fields={this.coldState.toolbarConfig.fields} 
                            title={this.coldState.toolbarConfig.title} 
                            id={this.coldState.toolbarConfig.id} 
                            fieldChanged={this.toolbarFieldChanged.bind(this)} />
                    ) : null
                }

                <div class="big-list-items" style={this.props.liststyle || {}}>
                    { this.coldState.topElement ? <this.coldState.topElement /> : null }

                    {
                        this.state.items.length == 0 ? (
                            <this.coldState.emptyComponent />
                        ) : [(<this.coldState.addComponent />), ...this.state.items.map(x => (
                            <this.coldState.component action={this.props.action} item={x} key={x[this.props.keyid || "_id"]} />
                        ))]
                    }
                </div>

                {
                    this.coldState.loadmoreButton && this.state.items.length >= this.coldState.batchsize ? (
                        <this.coldState.loadmoreButton onClick={this.loadMore.bind(this, false)} />
                    ) : null
                }
            </div>
        );
    }
}

class BigListNullComponent {
    render() { return null; }
}

class BigListEmptyTemplate {
    render() {
        return (<div class="big-list-empty-template">
            <b>Nothing was found using the current filters.</b>
        </div>);
    }
}

/**
 * BigListToolBarBuilder
 * 
 * 
 * Fields anatomy => { type : "text | select | checkbox", title : "Display name", name : "nameSentToServer", options? : [] }
 *   - type defaults to "text"
 *   - title detaults to empty string
 *   - name is mandatory
 * 
 *   - options defaults to empty array, is only used with type "select", is represented as an array object : [{ text : "Display text", value : "optionValue" }, {...}]
 */
export class BigListToolBarBuilder {
    get defaultOptions() {
        return {
            fields : [],
            title : "Filters"
        };
    }

    /**
     * make(params)
     * 
     * @param {object Toolbar settings including the fields to display, it, and title} params 
     */
    make(params = {}) {
        const settings = Object.assign(this.defaultOptions, params);

        return {
            fields : settings.fields,
            title : settings.title,
            id : settings.id
        }
    }
}

class BigListToolBar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fields : props.fields,
            title : props.title,
            id : props.id
        };

        this.coldValues = getLocal(LOCALSTORAGE_PREFIX + props.id) || {};
    }

    shouldComponentUpdate() {
        return false;
    }

    fieldChanged(ev) {
        this.coldValues[ev.target.name] = ev.target.value;
        storeLocal(LOCALSTORAGE_PREFIX + this.props.id, this.coldValues);

        this.props.fieldChanged && this.props.fieldChanged(ev.target.name, ev.target.value);
    }

    makeField(field) {
        switch (field.type) {
            case "select": {
                return (
                    <div class="big-list-tool-wrap">
                        <b>{field.title}</b>
                        <select onChange={this.fieldChanged.bind(this)} name={field.name} value={this.coldValues[field.name] || ""}>
                            {
                                field.options.map(opt => (<option value={opt.value}>{opt.text}</option>))
                            }
                        </select>
                    </div>
                );
            } break;

            case "checkbox": {
                return (
                    <div class="big-list-tool-wrap">
                        <b>{field.title}</b>
                        <input checked={this.coldValues[field.name] || false} type="checkbox" onChange={this.fieldChanged.bind(this)} name={field.name} />
                    </div>
                );
            } break;

            case "text":
            default: {
                return (
                    <div class="big-list-tool-wrap">
                        <b>{field.title}</b>
                        <input value={this.coldValues[field.name] || ""} type="text" onKeyUp={this.fieldChanged.bind(this)} name={field.name} />
                    </div>
                );
            }
        }
    }

    render() {
        log('BigList', 'Rendering toolbar with ' + this.state.fields.length + ' fields', 'detail');
        return (
            <div class="big-list-tool-bar">
                <div class="big-list-tool-bar-title">{this.state.title}</div>
                <div class="big-list-tools">
                    { this.state.fields.map(x => this.makeField(x)) }
                </div>
            </div>
        );
    }
}
