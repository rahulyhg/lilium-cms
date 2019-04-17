import { Component, h } from "preact";

export default class Modal extends Component {
    constructor(props) {
        super(props);
        this.state = { visible: false };
        this.bodyEl;
        this.backgroundEl;
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.canDismiss = typeof props.canDismiss !== 'undefined' ? props.canDismiss : true;
    }

    componentDidMount() {
        if (this.props.visible) {
            this.show();
        }
    }
    
    fireClose() {
        this.props.onClose && this.props.onClose();
    }
    
    close() {
        window.liliumcms.unbind('keydown', this.handleKeyDownBound);
        this.bodyEl && this.bodyEl.classList.remove("shown");
        setTimeout(() => this.setState({ visible: false }), 200);
    }
    
    show() {
        this.setState({ visible: true }, () => {
            if (this.canDismiss) window.liliumcms.bindFirst('keydown', this.handleKeyDownBound);
            this.bodyEl && setTimeout(() => this.bodyEl && this.bodyEl.classList.add("shown"), 200);
            this.bodyEl.focus();
        });
    }

    componentWillReceiveProps(props) {
        if (props.visible) {
            this.show();
        } else {
            this.close();
        }
    }
    
    handleKeyDown(ev) {
        if (this.canDismiss && ev.which == 27 || ev.keyCode == 27) {
            this.props.onClose ? this.props.onClose() : this.close();
            return false;
        }
    }

    handleOutsideClick(e) {
        if (this.canDismiss && e.target == this.backgroundEl) {
            this.props.onClose ? this.props.onClose() : this.close();
        }
    }

    render() {
        if (!this.state.visible) {
            return null;
        } else {
            return (
                <div className="modal-bg" onClick={this.handleOutsideClick.bind(this)} ref={e => { this.backgroundEl = e }}>
                    {/* Tabindex of -1 to allow for programmatic focus the element */}
                    <div tabindex='-1' className="modal-body" ref={x => (this.bodyEl = x)}>
                        <div className="modal-header">
                            <h3 className="modal-title">{this.props.title}</h3>
                            { this.props.onClose ? (
                                <span className="close-btn" title='Close' onClick={this.fireClose.bind(this)}><i style={{ color: 'red', float: 'right' }} class="fas fa-circle"></i></span>
                            ) : null }
                        </div>
                        <div className="modal-content">
                            {
                                this.props.children
                            }
                        </div>
                        <div className="modal-footer">
                            
                        </div>
                    </div>
                </div>
            )
        }
    }
}
