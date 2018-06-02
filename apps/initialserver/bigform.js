import { h, render, Component } from 'preact';
import { SingleSelect, FieldSection, TextField, ActionButton } from './fields';

function maybeParseInt(value) {
    return isNaN(value) ? value : parseInt(value);
}

export default class BigForm extends Component {
    constructor(props) {
        super(props);
        this.values = {};
    }

    fieldUpdated(id, value) {
        this.values[id] = maybeParseInt(value);
    }

    finishup() {
        this.props.submit(this.values);
    }

    render() {
        return (
            <div class="bigform">
                <FieldSection displayname="Website">
                    <TextField onchange={this.fieldUpdated.bind(this)} id="websitetitle" displayname="Website title" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="websiteurl" displayname="Full URL" default="https://" />
                    <SingleSelect onchange={this.fieldUpdated.bind(this)} id="websitelang" displayname="Display language" options={[
                        { value : "fr-ca", displayname : "Canadian English" },
                        { value : "en-us", displayname : "American English" },
                        { value : "en-ca", displayname : "Français Canadien" },
                        { value : "fr-fr", displayname : "Français de France" }
                    ]} />
                </FieldSection>

                <FieldSection displayname="Lilium administration">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="adminuser" displayname="Admin username" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="adminpass" displayname="Admin password" type="password" />
                </FieldSection>

                <FieldSection displayname="Lilium network configuration">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="networkproc" displayname="Number of processes" type="number" default="2" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="networkport" displayname="Upstream port number" type="number" default="8080" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="network" displayname="Max POST size" type="number" default="3000000000" />
                </FieldSection>

                <FieldSection displayname="Email notifications">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="emailaddress" displayname="Email address" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="emailpassword" displayname="Email password" type="password" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="emailfrom" displayname="Email sender display name" />
                </FieldSection>

                <FieldSection displayname="Facebook">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="facebookappid" displayname="Application ID" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="facebookapppubtoken" displayname="Public Token" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="facebookappprivtoken" displayname="Private Token" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="facebookappogversion" displayname="Open Graph version" default="3.0" />
                </FieldSection>

                <FieldSection displayname="Google API">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="googlekey" displayname="Service key as JSON" multiline={true} />
                </FieldSection>

                <FieldSection displayname="Double-Click for Publisher API">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="dfpkey" displayname="Service key as JSON" multiline={true} />
                </FieldSection>

                <FieldSection displayname="Stripe">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripeversion" displayname="API version (xxxx-xx-xx)" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripeconnectid" displayname="Stripe Connect ID" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripeoauth" displayname="OAuth redirect URL" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripesk" displayname="Secret key" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripepk" displayname="Publishable key" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripecc" displayname="Credit card number" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripeexp" displayname="Credit card expiry date (mm-yy)" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="stripecvc" displayname="CVC" />
                </FieldSection>

                <FieldSection displayname="Twilio">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="twiliosid" displayname="Identifier (SID)" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="twiliotoken" displayname="Token" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="twiliofrom" displayname="Phone number" />
                </FieldSection>    

                <FieldSection displayname="Content Delivery Network">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="cdnurl" displayname="CDN full URL" default="https://cdn." />
                </FieldSection>       

                <FieldSection displayname="Darksky">
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="darkskykey" displayname="Secret key" />
                    <TextField onchange={this.fieldUpdated.bind(this)}  id="darkskyttl" displayname="Cache time-to-live (TTL)" default="3600000" />
                </FieldSection>    

                <FieldSection displayname="Finish up">
                    <ActionButton click={this.finishup.bind(this)} text="Install Stack" />
                </FieldSection>              
            </div>
        )
    }
}