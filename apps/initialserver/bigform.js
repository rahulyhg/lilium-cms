import { h, render, Component } from 'preact';
import { SingleSelect, FieldSection, TextField, ActionButton } from './fields';

function maybeParseInt(value) {
    return isNaN(value) ? value : parseInt(value);
}

// Required fields
const REQUIRED_FIELDS = [
    "websiteurl", "websitelang",
    "networkproc", "networkport",
    "maxpostsize",
    "facebookappid", "facebookapppubtoken", "facebookappprivtoken", "facebookappogversion",
    "cdnurl",
    "darkskyttl",
    "websitetitle",
    "adminemail",
    "adminuser", "adminpass",
    "emailaddress", "emailpassword", "emailfrom",
    "googlekey", "googleaccountid", "googleview",
    "darkskykey"
];
  

export default class BigForm extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    fieldUpdated(id, value) {
        this.values[id] = maybeParseInt(value);

        let keys = Object.keys(this.values);
        let valid = true;
        REQUIRED_FIELDS.forEach(x => {
            if (!keys.includes(x)) {
                valid = false;
            }
        });

        this.setState({ valid })
    }

    finishup() {
        let keys = Object.keys(this.values);
        let valid = true;
        REQUIRED_FIELDS.forEach(x => {
            if (!keys.includes(x)) {
                valid = false;
            }
        });

        if (valid) {
            this.props.submit(this.values);
        }
    }

    render() {
        return (
            <div className={"bigform " + (this.props.visible ? "visible" : "")}>
                <FieldSection displayname="Website">
                    <TextField onchange={this.fieldUpdated.bind(this)} values={this.values} id="websitetitle" displayname="Website title *" />
                    <TextField onchange={this.fieldUpdated.bind(this)} values={this.values}  id="websiteurl" displayname="Full URL *" default="https://" />
                    <SingleSelect onchange={this.fieldUpdated.bind(this)} values={this.values}  id="websitelang" displayname="Display language *" options={[
                        { value : "fr-ca", displayname : "Canadian English" },
                        { value : "en-us", displayname : "American English" },
                        { value : "en-ca", displayname : "Français Canadien" },
                        { value : "fr-fr", displayname : "Français de France" }
                    ]} />
                </FieldSection>

                <FieldSection displayname="Lilium administration">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="adminuser" displayname="Admin username *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="adminpass" displayname="Admin password *" type="password" />                    
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="adminemail" displayname="Admin email *" />
                </FieldSection>

                <FieldSection displayname="Lilium network configuration">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="networkproc" displayname="Number of processes *" type="number" default="2" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="networkport" displayname="Upstream port number *" type="number" default="8080" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="maxpostsize" displayname="Max POST size *" type="number" default="3000000000" />
                </FieldSection>

                <FieldSection displayname="Email notifications">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="emailaddress" displayname="Email address *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="emailpassword" displayname="Email password *" type="password" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="emailfrom" displayname="Email sender display name *" />
                </FieldSection>

                <FieldSection displayname="Facebook">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="facebookappid" displayname="Application ID *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="facebookapppubtoken" displayname="Public Token *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="facebookappprivtoken" displayname="Private Token *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="facebookappogversion" displayname="Open Graph version *" default="3.0" />
                </FieldSection>

                <FieldSection displayname="Google API">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="googlekey" displayname="Service key as JSON *" multiline={true} />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="googleaccountid" displayname="Analytics account ID *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="googleview" displayname="Analytics website view *" />
                </FieldSection>

                <FieldSection displayname="Double-Click for Publisher API">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="dfpkey" displayname="Service key as JSON" multiline={true} />
                </FieldSection>

                <FieldSection displayname="Stripe">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripeversion" displayname="API version (xxxx-xx-xx)" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripeconnectid" displayname="Stripe Connect ID" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripeoauth" displayname="OAuth redirect URL" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripesk" displayname="Secret key" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripepk" displayname="Publishable key" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripecc" displayname="Credit card number" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripeexp" displayname="Credit card expiry date (mm-yy)" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="stripecvc" displayname="CVC" />
                </FieldSection>

                <FieldSection displayname="Twilio">
                    <TextField onchange={this.fieldUpdated.bind(this)} values={this.values} id="twiliosid" displayname="Identifier (SID)" />
                    <TextField onchange={this.fieldUpdated.bind(this)} values={this.values} id="twiliotoken" displayname="Token" />
                    <TextField onchange={this.fieldUpdated.bind(this)} values={this.values} id="twiliofrom" displayname="Phone number" />
                </FieldSection>    

                <FieldSection displayname="Content Delivery Network">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="cdnurl" displayname="CDN full URL *" default="https://cdn." />
                </FieldSection>       

                <FieldSection displayname="Darksky">
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="darkskykey" displayname="Secret key *" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  values={this.values}  id="darkskyttl" displayname="Cache time-to-live (TTL) *" default="3600000" />
                </FieldSection>    

                { this.state.valid ? 
                <FieldSection displayname="Finish up">
                    <ActionButton click={this.finishup.bind(this)} text="Install Stack" />
                </FieldSection> : null }
                        
            </div>
        )
    }
}