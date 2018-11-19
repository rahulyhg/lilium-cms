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
            <div class="card plugin-strip">
                <div class="plugin-details">
                    <div class="detail-head">
                        <div class="bubble-wrap">
                            <b class="big">{this.props.item.identifier}</b> 
                            <b class={"bubble " + (this.state.active ? "green" : "")}>{this.state.active ? "Enabled" : "Disabled"}</b>
                        </div>
                    </div>   
                    <div class="detail-list">
                        <div>
                            {this.props.item.description || (<i>This plugin does not have a description.</i>)}
                        </div>             
                        <div>
                            Entry file : <b>{this.props.item.entry}</b>
                        </div>
                    </div>
                </div>
                <div class="plugin-action-wrap">
                    <ButtonWorker theme={this.state.active ? "red" : "white"} type={this.state.active ? "fill" : "outline"} work={this.toggle.bind(this)} text={this.state.active ? "Disable" : "Enable"} />
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
            <div>
                <div class="leader-title">
                    <div class="leader-title-responsive">
                        <h1>Lilium plugins</h1>
                        <p>Plugins are little pieces of software extending core features of Lilium. Plugins have access to all Lilium's libraries, can listen to / trigger events, override basic logic, and modify the interface of the CMS.</p>
                    </div>
                </div>
                <div class="leader-content">
                    <BigList endpoint="/plugins/bunch" listitem={PluginItem} />
                </div>
            </div>
        )
    }
}
