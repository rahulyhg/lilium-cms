import { Component, h } from "preact";
import { TextField, ButtonWorker } from "../../widgets/form";
import API from "../../data/api";
import { castNotification } from "../../layout/notifications";
import { navigateTo } from "../../routing/link";
import { dismissOverlay } from '../../overlay/overlaywrap';

class Version extends Component {
    constructor(props) {
        super(props);
        this.values = { destination: props.destination, identifier: this.props.identifier };
    }

    updateVersion(name, value) {
        this.values[name] = value;
        this.props.update && this.props.update(this.props.index, this.values);
    }

    remove() {
        this.props.onRemove(this.props.index);
    }

    render() {
        return (
            <div className="version version-card card">
                <TextField name='identifier' initialValue={this.props.identifier} placeholder='Medium / Identifier'
                            onChange={this.updateVersion.bind(this)} />
                <TextField name='destination' initialValue={this.props.destination} placeholder='Destination URL' type='url'
                            onChange={this.updateVersion.bind(this)} />
                <ButtonWorker sync work={this.remove.bind(this)} text="Remove version" theme="red" type="outline" />
            </div>
        )
    }
}

export class CreatePonglink extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            identifier : "",
            defaultDestinationUrl : "",
            publicSourceName : "",
            publicCampaignName : "",
            versions: [{ identifier : '', destination: '', id : Math.random().toString(16).substring(2) }] 
        };
    }

    addVersion() {
        const versions = [...this.state.versions];
        versions.push({ identifier: '', destination: '', id : Math.random().toString(16).substring(2) });
        this.setState({ versions });
    }

    updateValues(name, value) {
        this.setState({ [name] : value })
    }

    updateVersion(index, version) {
        const versions = this.state.versions;
        versions[index] = version;
    }

    save(done) {
        if (!this.state.identifier || !this.state.defaultDestinationUrl || !this.state.publicSourceName || !this.state.publicCampaignName) {
            castNotification({
                type : "warning",
                title : "Missing information",
                message : "All fields are mandatory."
            })

            return done && done();
        }
        
        const payload = {
            identifier: this.state.identifier,
            defaults: {
                destination: this.state.defaultDestinationUrl,
                source: this.state.publicSourceName,
                campaign: this.state.publicCampaignName,
            },
            versions: this.state.versions
        }

        API.post('/ponglinks/create', payload, (err, data, r) => {
            if (r.status == 200) {
                return navigateTo('/ponglinks');
            } else {
                castNotification({
                    title: 'Error creating ponglink campaign',
                    type: 'error'
                })
            }
        });

        done && done();
    }

    removeVersion(index) {
        if (this.state.versions.length == 1) {
            castNotification({
                type : 'info',
                title : 'Cannot remove version',
                message : 'A Ponglink campaign requires at least one version.'
            })
        } else {
            const versions = [...this.state.versions];
            versions.splice(index, 1);
            this.setState({ versions })
        }
    }

    render() {
        return (
            <div id="create-ponglink" class="overlay-form">
                <h1>Ponglink campaign information</h1>
                <TextField initialValue={this.state.identifier} name='identifier' placeholder='Ponglink identifier' onChange={this.updateValues.bind(this)} />
                <TextField initialValue={this.state.defaultDestinationUrl} name='defaultDestinationUrl' type='url' placeholder='Default destination URL' onChange={this.updateValues.bind(this)} />
                <TextField initialValue={this.state.publicCampaignName} name='publicCampaignName' placeholder='Public campaign name' onChange={this.updateValues.bind(this)} />
                <TextField initialValue={this.state.publicSourceName} name='publicSourceName' placeholder='Public Source name' onChange={this.updateValues.bind(this)} />

                <h1>Ponglink versions</h1>
                <p>A Ponglink campaign can use multiple locations and redirect users to more than one destination. Click the Add Version button to create an additional ponglink version.</p>
                {
                    this.state.versions.map((version, index) => (
                        <Version onRemove={this.removeVersion.bind(this)} key={version.id} index={index} identifier={version.identifier} destination={version.destination} update={this.updateVersion.bind(this)} />
                    ))
                }
                <ButtonWorker text='Add version' theme='blue' type='fill' sync work={this.addVersion.bind(this)} />

                <hr />
                <div style={{ textAlign:'right' }}>
                    <ButtonWorker text='Create campaign' theme='purple' type='fill' work={this.save.bind(this)} />
                    <ButtonWorker text='Cancel' theme='red' type='outline' work={() => dismissOverlay()} />
                </div>

            </div>
        );
    }
}
