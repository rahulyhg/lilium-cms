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
    render() {
        return (
            <div class="field-wrapper">
                <label>{this.props.displayname}</label>
                <input type="text" id={this.props.id} value={this.props.default || ""} />
            </div>
        )
    }
}