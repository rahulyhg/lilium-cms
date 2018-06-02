import { h, render, Component } from 'preact';
import { FieldSection, TextField } from './fields';

export default class BigForm extends Component {
    render() {
        return (
            <div class="bigform">
                <FieldSection displayname="Website">
                    <TextField id="websitetitle" displayname="Website title" />
                    <TextField id="websiteurl" displayname="Full URL" default="https://" />
                    <TextField id="websitelang" displayname="Display language" />
                </FieldSection>
                <FieldSection displayname="Facebook">
                    <TextField id="facebookappid" displayname="Application ID" />
                    <TextField id="facebookapppubtoken" displayname="Public Token" />
                    <TextField id="facebookappprivtoken" displayname="Private Token" />
                    <TextField id="facebookappogversion" displayname="Open Graph version" default="3.0" />
                </FieldSection>
            </div>
        )
    }
}