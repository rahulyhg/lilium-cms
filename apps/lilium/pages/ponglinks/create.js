import { Component, h } from "preact";
import { TextField, ButtonWorker } from "../../widgets/form";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import { navigateTo } from "../../routing/link";

class Version extends Component {
    constructor(props) {
        super(props);
        this.values = { destination: props.destination, identifier: this.props.identifier };
    }

    updateVersion(name, value) {
        this.values[name] = value;
        this.props.update && this.props.update(this.props.index, this.values);
    }

    render() {
        return (
            <div className="version">
                <TextField name='identifier' initialValue={this.props.medium} placeholder='Medium / Identifie'
                            onChange={this.updateVersion.bind(this)} />
                <TextField name='destination' initialValue={this.props.destination} placeholder='Destination URL' type='url'
                            onChange={this.updateVersion.bind(this)} />
                <hr/>
            </div>
        )
    }
}

export class CreatePonglink extends Component {
    constructor(props) {
        super(props);
        this.values = {};
        this.state = { versions: [] };
    }

    addVersion() {
        const versions = this.state.versions;
        versions.push({ medium: '', destination: '' });
        this.setState({ versions });
    }

    updateValues(name, value) {
        this.values[name] = value;
    }

    updateVersion(index, version) {
        this.state.versions[index] = version;
    }

    save(done) {
        const payload = {
            identifier: this.values.identifier,
            defaults: {
                destination: this.values.defaultDestinationUrl,
                source: this.values.publicSourceName,
                campaign: this.values.publicCampaignName,
            },
            versions: this.state.versions
        }
        
        API.post('/ponglinks/create', payload, (err, data, r) => {
            if (r.status == 200) {
                navigateTo('/ponglinks');
            } else {
                castNotification({
                    title: 'Error creating ponglink campaign',
                    type: 'error'
                })
            }
        });

        done && done();
    }

    render() {
        return (
            <div id="create-ponglink" class="overlay-form">
                <h1>Ponglink campaign information</h1>
                <TextField name='identifier' placeholder='Ponglink identifier' onChange={this.updateValues.bind(this)} />
                <TextField name='defaultDestinationUrl' type='url' placeholder='Default destination URL' onChange={this.updateValues.bind(this)} />
                <TextField name='publicCampaignName' placeholder='Public campaign name' onChange={this.updateValues.bind(this)} />
                <TextField name='publicSourceName' placeholder='Public Source name' onChange={this.updateValues.bind(this)} />

                <ButtonWorker text='Create' work={this.save.bind(this)} />

                <h1>Ponglink versions</h1>
                {
                    this.state.versions.map((version, index) => {
                        return (
                            <Version  key={index} index={index} identifier={version.identifier} destination={version.destination} update={this.updateVersion.bind(this)} />
                        ); 
                    })
                }

                <ButtonWorker text='Add version' sync={true} work={this.addVersion.bind(this)} />
            </div>
        );
    }
}
