import { Component, h } from "preact";

class TreeNode extends Component {
    constructor(props) {
        super(props);
        this.state = {
            children : this.props.children || [],
            open : this.props.open || false
        };
    }

    toggle() {
        this.setState({ open : !this.state.open });
    }

    onClick() {
        this.setState({ open : true });
        this.props.onEvent("selected", this.props._id);
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
                    <TreeNodeCollection onEvent={this.props.onEvent.bind(this)} open={this.state.open} nodes={this.state.children} displayname={this.props.displayname} />
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
                    { this.state.children.map(x => (<TreeNode onEvent={this.props.onEvent.bind(this)} displayname={x.displayname} children={x.children || []} _id={x._id} />)) }
                </div>
                <div class="tree-node-add-child" onClick={this.props.onEvent.bind(this, 'addChildren', this.props._id)}>
                    <i class="far fa-plus"></i> 
                    <span>Add to {this.props.displayname}</span>
                </div>
            </div>
        );
    }
}

export class TreeView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            nodes : this.props.nodes || []
        };
    }

    componentWillReceiveProps(props) {
        if (props.nodes) {
            this.setState({ nodes : props.nodes });
        }
    }

    onEvent(name, extra) {
        this.props.onEvent && this.props.onEvent(name, extra);
    }

    render() {
        return (
            <div class="tree-view">
                { this.state.nodes.map(x => <TreeNode 
                    onEvent={this.onEvent.bind(this)} 
                    displayname={x.displayname}
                    children={x.children || []}
                    _id={x._id}
                />) }

                <div class="tree-node-add-child" onClick={this.props.onEvent.bind(this, 'addCategory')}>
                    <i class="far fa-plus"></i> 
                    <span>Add category</span>
                </div>
            </div>
        )
    }
}
