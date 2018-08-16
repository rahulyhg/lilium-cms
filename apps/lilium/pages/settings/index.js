import { Component, h } from 'preact';
import API from '../../data/api';
import { TextField, SelectField } from '../../widgets/form';

const styles = {
    h2 : {
        padding: "15px 15px 5px",
        margin: 0,
        borderBottom : "1px solid #DDD"
    }
}

export default class SettingsPage extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    componentDidMount() {
        API.get('/settings', {}, (err, settings) => {
            this.values = settings;
            this.setState({
                ready : true
            });
        });
    }

    fieldChanged(field, value) {
        API.post('/settings/udpateOneField', {
            field, value
        }, () => {

        })
    }

    render() {
        if (!this.state.ready) {
            return (
                <div>Loading...</div>
            );
        }

        return (
            <div id="settings-page">
                <h1>Lilium CMS administrative settings</h1>
                <p class="page-tutorial-strip">
                    The fields will save automatically. Lilium will need to be restarted for changes to take effect.
                </p>

                <div style={{ maxWidth: 720, margin: "15px auto" }}>
                    <h2 style={styles.h2}>This website</h2>
                    <div style={{ padding : 15 }}>
                        <TextField onChange={this.fieldChanged.bind(this)} name="website.sitetitle" placeholder="Website title" initialValue={this.values.website.sitetitle} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="website.catchline" placeholder="Website catchline" initialValue={this.values.website.catchline} />
                    </div>

                    <h2 style={styles.h2}>Content Delivery Network</h2>
                    <div style={{ padding : 15 }}>
                        <TextField onChange={this.fieldChanged.bind(this)} name="content.cdn.domain" placeholder="CDN Domain" initialValue={this.values.content.cdn.domain} />
                    </div>

                    <h2 style={styles.h2}>Google</h2>
                    <div style={{ padding : 15 }}>
                        <TextField onChange={this.fieldChanged.bind(this)} name="google.apikey" placeholder="Global API Key" initialValue={this.values.google.apikey} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="analytics.serviceaccount" placeholder="Service Account Email" initialValue={this.values.analytics.serviceaccount} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="analytics.jsonkeypath" placeholder="Analytics key path" initialValue={this.values.analytics.jsonkeypath} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="analytics.accountid" placeholder="Analytics account ID" initialValue={this.values.analytics.accountid} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="analytics.siteviewid" placeholder="Analytics Site View ID" initialValue={this.values.analytics.siteviewid} />
                    </div>

                    <h2 style={styles.h2}>Facebook</h2>
                    <div style={{ padding : 15 }}>
                        <TextField onChange={this.fieldChanged.bind(this)} name="social.facebook.appid" placeholder="Facebook Application ID" initialValue={this.values.social.facebook.appid} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="social.facebook.token" placeholder="Facebook Public Access Token" initialValue={this.values.social.facebook.token} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="social.facebook.privtoken" placeholder="Facebook Private Access Token" initialValue={this.values.social.facebook.privtoken} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="social.facebook.apiversion" placeholder="Facebook Graph Version" initialValue={this.values.social.facebook.apiversion} />
                    </div>
                    
                    <h2 style={styles.h2}>Email delivery</h2>
                    <div style={{ padding : 15 }}>
                        <TextField onChange={this.fieldChanged.bind(this)} name="emails.senderemail" placeholder="Sender Email" initialValue={this.values.emails.senderemail} />
                        <TextField onChange={this.fieldChanged.bind(this)} name="emails.senderpass" placeholder="Sender Password" initialValue={this.values.emails.senderpass} type="password" />
                        <TextField onChange={this.fieldChanged.bind(this)} name="emails.senderfrom" placeholder="Sender Name" initialValue={this.values.emails.senderfrom} />
                    </div>

                    <h2 style={styles.h2}>Environment</h2>
                    <div style={{ padding : 15 }}>
                        <SelectField onChange={this.fieldChanged.bind(this)} name="env" placeholder="Lilium CMS environment" initialValue={this.values.env} options={[
                            { displayname : "Development", value : "dev" },
                            { displayname : "Production", value : "prod" },
                            { displayname : "Full Output", value : "output" },
                        ]} />
                    </div>
                </div>
            </div>
        )
    }
}