import { h, render, Component } from 'preact';

export class FieldSection extends Component {
    render() {
        return (
            <fieldset>
                <legend>{this.props.displayname}</legend>
                {this.props.children}
            </fieldset>
        );
    }
}

export class TextField extends Component {
    changed(ev) {
        this.props.onchange(this.props.id, ev.target.value);
    }

    componentDidMount() {
        this.props.default && this.props.onchange(this.props.id, this.props.default);
    }

    render() {
        return (
            <div class="field-wrapper">
                <label>{this.props.displayname}</label>
                {
                    this.props.multiline ? 
                    <textarea onChange={this.changed.bind(this)} id={this.props.id} value={this.props.default || ""}></textarea> :
                    <input    onChange={this.changed.bind(this)} type={this.props.type || "text"} id={this.props.id} value={this.props.default || ""} />
                }
            </div>
        )
    }
}

export class SingleSelect extends Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.props.onchange(this.props.id, this.props.options && this.props.options[0] && this.props.options[0].value);
    }

    changed(ev) {
        this.props.onchange(this.props.id, ev.target.value);
    }

    render() {
        return (
            <div class="field-wrapper">
                <label>{this.props.displayname}</label>
                <select onChange={this.changed.bind(this)} id={this.props.id}>
                    {
                        this.props.options.map(opt => <option value={opt.value} key={opt.value}>{opt.displayname}</option>)
                    }
                </select>
            </div>
        )
    }
}

export class ActionButton extends Component {
    render() {
        return (
            <button onClick={this.props.click}>{this.props.text}</button>
        );
    }
}