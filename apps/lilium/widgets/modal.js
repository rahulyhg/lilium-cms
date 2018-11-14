import { Component, h } from "preact";

export default class Modal extends Component {
    constructor(props) {
        super(props);
        this.state = { visible: this.props.visible || false };
    }

    fireClose() {
        this.props.onClose && this.props.onClose();
    }

    close() {
        this.setState({ visible: false });
    }

    show() {
        this.setState({ visible: true });
    }

    componentWillReceiveProps(props) {
        if (props.visible) {
            this.show();
        } else {
            this.close();
        }
    }
    
    handleKeyUp(ev) {
        if (ev.which == 27 || ev.keyCode == 27) {
            this.close();
        }
    }

    render() {
        if (!this.state.visible) {
            return null;
        } else {
            return (
                <div className="modal-bg" onKeyUp={this.handleKeyUp.bind(this)}>
                    <div className="modal-body">
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
