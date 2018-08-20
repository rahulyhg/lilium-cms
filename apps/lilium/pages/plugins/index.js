import { h, Component } from 'preact';
import { BigList } from '../../widgets/biglist';  
import { ButtonWorker } from '../../widgets/form';
import API from '../../data/api';
import { castNotification } from '../../layout/notifications';

const styles = {

};

class PluginItem extends Component {
    constructor(props) {
        super(props);

        this.state = {
            active : props.item.active
        }
    }

    toggle(done) {
        API.post('/plugins/' + (this.state.active ? "unregisterPlugin" : "registerPlugin"), {
            identifier : this.props.item.identifier
        }, (err) => {
            done();
            this.setState({ active : !this.state.active });
            castNotification({
                type : "success",
                title : "Plugin " + this.props.item.identifier,
                message : "Successfully toggled plugin with identifier " + this.props.item.identifier
            })
        })
    }

    render() {
        return (
            <div class="plugin-strip">
                <div class="plugin-details">
                    <div class="plugin-title-strip">
                        <b class="">{this.props.item.identifier}</b> 
                        <b class={"plugin-status " + (this.state.active ? "active" : "")}>{this.state.active ? "Enabled" : "Disabled"}</b>
                    </div>   
                    <p>{this.props.item.description || (<i>This plugin does not have a description.</i>)}</p>             
                    <div class="plugin-entry-file">
                        <span>Entry file : {this.props.item.entry}</span>
                    </div>
                </div>
                <div class="plugin-action-wrap">
                    <ButtonWorker theme={this.state.active ? "danger" : "white"} work={this.toggle.bind(this)} text={this.state.active ? "Disable" : "Enable"} />
                </div>
            </div>
        )
    }
}

export default class PluginList extends Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    componentDidMount() {

    }

    render() {
        return (
            <div class="plugins-page" style={{ maxWidth : 720, margin: "20px auto" }}>
                <h1>Plugins</h1>

                <BigList endpoint="/plugins/bunch" listitem={PluginItem} />
            </div>
        )
    }
}