import { Component, h } from "preact";

class AddToBubble extends Component {
    constructor(props) {
        super(props);
        this.state = {
            input : false
        };
    }

    addTo(text) {
        this.props.onEvent('addto', { _id : this.props._id, isRoot : this.props.isRoot, text });
    }

    toggle() {
        this.setState({
            input : true
        }, () => {
            this.inputEl.focus();
        });
    }

    maybeSubmit(text) {
        if (text) {
            this.addTo(text);
        } 

        this.setState({
            input : false
        })
    }

    onKeyDown(ev) {
        if (ev.key == "Enter") {
            this.maybeSubmit(ev.target.value);
        }
    }

    onBlur(ev) {
        this.setState({ input : false })
    }

    render() {
        if (this.state.input) {
            return (
                <div class="tree-node-add-child">
                    <input ref={x => (this.inputEl = x)} type="text" class="tree-node-seemless-input" placeholder="Item name, then Enter" onKeyDown={this.onKeyDown.bind(this)} onBlur={this.onBlur.bind(this)} />
                </div>
            )
        }

        return (
            <div class="tree-node-add-child" onClick={ this.toggle.bind(this) }>
                <i class="far fa-plus"></i> 
                <span>Add to {this.props.displayname}</span>
            </div>
        )
    }
}

class TreeNode extends Component {
    constructor(props) {
        super(props);
        this.state = {
            children : this.props.children || [],
            open : this.props.open || false
        };
    }

    componentWillReceiveProps(props) {
        if (typeof props.open != "undefined") {
            this.setState({ open : props.open });
        }
    }

    toggle() {
        this.props.node.open = !this.props.node.open;
        this.setState({ open : !this.state.open });
    }

    onClick() {
        this.setState({ open : true });
        this.props.onEvent("selected", { _id : this.props._id, isRoot : this.props.isRoot });
    }

    render() {
        return (
            <div class="tree-node">
                <div class="tree-node-display-text">
                    <span onClick={this.toggle.bind(this)}><i class={"far fa-chevron-" + (this.state.open ? "down" : "right")}></i></span>
                    <span onClick={this.onClick.bind(this)} class={this.state.open ? "bold" : ""}>
                        {this.props.displayname}
                    </span>
                </div>
                <div class="tree-node-children-wrapper">
                    <TreeNodeCollection open={this.state.open} onEvent={this.props.onEvent} open={this.state.open} nodes={this.state.children} displayname={this.props.displayname} _id={this.props._id} isRoot={this.props.isRoot} />
                </div>
            </div>
        )
    }
}

class TreeNodeCollection extends Component {
    constructor(props) {
        super(props);
        this.state = {
            children : this.props.nodes,
            open : this.props.open || false
        };
    }

    componentWillReceiveProps(props) {
        if (typeof props.open != "undefined") {
            this.setState({ open : props.open })
        }
    }

    render() {
        if (!this.state.open) {
            return null;
        }

        return (
            <div class="tree-node-collection">
                <div class="tree-node-children-list">
                    { this.state.children.map(x => (<TreeNode onEvent={this.props.onEvent} displayname={x.displayname} children={x.children || []} _id={x._id} key={x._id} open={x.open} node={x} />)) }
                </div>
                <AddToBubble onEvent={this.props.onEvent} _id={this.props._id} isRoot={this.props.isRoot} displayname={this.props.displayname} />
            </div>
        );
    }
}

export class TreeView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            nodes : this.props.nodes || [],
            value : this.props.value || undefined
        };
    }

    componentWillReceiveProps(props) {
        const newState = {};
        if (props.nodes) {
            newState.nodes = props.nodes;
        } 

        this.setState(newState, () => {
            if (props.value) {
                this.updateSelected(props.value);
            }
        });
    }

    componentDidMount() {
        this.updateSelected(this.state.value);
    }

    updateSelected(value) {
        const nodes = this.state.nodes || [];
        if (value) {
            const searchChildrenNodes = arr => {
                const maybeFound = arr.find(x => x._id == value || searchChildrenNodes(x.children || []));
                if (maybeFound) {
                    maybeFound.open = true;
                    return true;
                }
            };

            const maybeFound = nodes.find(node => searchChildrenNodes(node.children || []));
            if (maybeFound) {
                maybeFound.open = true;

                this.setState({ nodes })
            }
        }
    }

    onEvent(ev, params) {
        this.props.onEvent && this.props.onEvent(ev, params);
    }

    onMasterEvent(ev, params) {
        this.props.onEvent && this.props.onEvent('addroot', params);
        const newNode = {
            children : [],
            _id : params.text,
            displayname : params.text
        };

        const nodes = [this.state.nodes, newNode];
        this.setState({ nodes });
    }

    render() {
        return (
            <div class="tree-view">
                <div>
                    { this.state.nodes.map(x => <TreeNode 
                        onEvent={this.onEvent.bind(this)} 
                        displayname={x.displayname}
                        isRoot={true}
                        open={x.open || false}
                        children={x.children || []}
                        key={x._id}
                        node={x}
                        _id={x._id}
                    />) }
                </div>

                <AddToBubble onEvent={this.onMasterEvent.bind(this)} isRoot={true} displayname={this.props.topVerbatim} />
            </div>
        )
    }
}
