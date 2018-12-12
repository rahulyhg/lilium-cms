import { h, Component } from "preact";
import API from '../../data/api';
import { TextField, ButtonWorker, SelectField } from '../../widgets/form';
import { Picker } from '../../layout/picker';
import { ImagePicker } from '../../layout/imagepicker';
import { castNotification } from '../../layout/notifications';
import { Spinner } from '../../layout/loading';

const asyncFieldUpdate = (name, value) => {
    API.post('/me/updateOneField', { field: name, value: value }, (err, data) => {
        if (!err)
            log('ProfilePage', 'Updated field ' + name, 'success');
        else
            log('ProfilePage', 'Error updating field ' + name, 'error');
    });
}

const BADGE_WIDTH = 56;
const BADGE_HEIGHT_RATIO = 0.875;

class UserBadge extends Component {
    getImageName() {
        return Math.min((Math.floor(this.props.badge.level / 2) + 1), 4).toString() + ".png";
    }

    render() {
        return (
            <span>
                <div 
                    class={"me-decoration level-" + this.props.badge.level} 
                    style={{filter: "hue-rotate("+( this.props.badge.level * 30 )+"deg)"}}
                    title={this.props.badge.title + " " + this.props.badge.displayname + " - " + this.props.badge.reason}
                >
                    <i class={this.props.badge.classes}></i>
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width={BADGE_WIDTH} height={BADGE_WIDTH / BADGE_HEIGHT_RATIO} viewbox="0 0 55.42562584220407 64"><path d="M27.712812921102035 0L55.42562584220407 16L55.42562584220407 48L27.712812921102035 64L0 48L0 16Z"></path></svg>
                </div>
            </span>
        );
    }
}

export default class ProfilePage extends Component {
    constructor(props) {
        super(props);

        this.inputValues = {};
        this.state = {
            user: undefined,
            err: undefined,
            loading : true,
            tab : 0
        };

        this.tabs = [
            { text : "General", component : ProfileHeader } , 
            { text : "Contact info", component : ContactInfo }, 
            { text : "Payment", component : PaymentInfo }, 
            { text : "Social networks", component : SocialMedia }, 
            { text : "Password", component : PasswordResetForm }, 
            { text : "2-factor authentication", component : Manage2FAForm }
        ];
    }

    componentDidMount() {
        API.get('/entities/me', {}, (err, data) => {
            if (!err && data) {
                /// Remap social network for convenience
                let socialNetworks = data.user.socialnetworks;
                data.user.socialnetworks = {};
                for (let i = 0; i < socialNetworks.length; i++) {
                    data.user.socialnetworks[socialNetworks[i].network] = socialNetworks[i].username || "";
                }

                this.setState({ user: data.user, err: undefined, loading : false });
            } else {
                this.setState({ err, loading: false });
            }
        });
    }

    selectNewProfilePicture() {
        Picker.cast(new Picker.Session({ accept: [ImagePicker.slug], options : { [ImagePicker.slug] : {} } }), picked => {
            if (picked) {
                const avatarURL = picked[ImagePicker.slug].sizes.square.url;
                API.post('/me/updateOneField', { field: "avatarURL", value: avatarURL }, (err, data) => {
                    if (!err) {
                        log('ProfilePage', 'Updated profile picture', 'success');

                        const user = this.state.user;
                        user.avatarURL = picked[ImagePicker.slug].sizes.square.url;
                        this.setState({ user });

                        const ev = new CustomEvent('profilePicChanged', { detail: { url: user.avatarURL } });
                        document.dispatchEvent(ev);
                    } else {
                        console.log(err);
                        log('ProfilePage', 'Error updating profile picture', 'error');
                    }
                });
            }
        });
    }

    switchTab(tab) {
        if (this.state.tab != tab) {
            this.setState({ tab })
        }
    }

    fieldChanged(name, value) {
        const user = this.state.user;
        user[name] = value;
        this.setState({ user });
    }

    render() {
        if (this.state.loading) {
            return (<Spinner centered={true} />);
        }

        if (this.state.user) {
            const TabComponent = this.tabs[this.state.tab].component;
            return (
                <div id="profile">
                    <div class="me-card">
                        <div class="me-header">
                            <div class="me-header-split">
                                <img class="me-avatar" src={this.state.user.avatarURL} onClick={this.selectNewProfilePicture.bind(this)} />
                                <div class="me-header-text">
                                    <b>{this.state.user.displayname}</b>
                                    <div>@{this.state.user.username}</div>
                                </div>
                            </div>
                            <div class="me-header-split">
                                <div class="me-header-badges-title">Badges</div>
                                <div class="me-header-badges" style={{ width : ((BADGE_WIDTH + 10) * this.state.user.badges.length) }}>
                                    {
                                        this.state.user.badges.map(badge => (
                                            <UserBadge badge={badge} badges={this.props.badges} />
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                        <div class="me-body">
                            <div class="me-switcher">
                                <div class="me-switcher-menu">
                                    {
                                        this.tabs.map((tab, i) => (
                                            <div onClick={this.switchTab.bind(this, i)} class={i == this.state.tab ? "selected" : ""}>{tab.text}</div>
                                        ))
                                    }
                                </div>
                            </div>
                            <div class="me-panel">
                                <TabComponent user={this.state.user} onChange={this.fieldChanged.bind(this)} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div id="profile-error">
                    <h3>There was an error when trying to retrieve your user info, are you loggedchange-placeholder in?</h3>
                </div>
            );
        }
    }
}

class ProfileHeader extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: this.props.user
        }
    }
 
    render() {
        return (
            <div id="profile-header">
                <div id="profile-info-wrapper" >
                    <h2>General</h2>

                    <TextField name="displayname"  initialValue={this.state.user.displayname} value={this.state.user.displayname}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave placeholder="Full name" />

                    <TextField name="jobtitle" initialValue={this.state.user.jobtitle || ''} value={this.state.user.jobtitle} placeholder='Job Title'
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave   />

                    <TextField name="description" className='change-placeholder' id="descriptichange-placeholderon" 
                        placeholder='Write a small introduction paragraph' multiline={true} value={this.state.user.description}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave initialValue={this.state.user.description} />
                </div>
            </div>
        );
    }
}

class ContactInfo extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="contact-info">
                <h2>Contact Information</h2>

                <TextField type="tel" name="phone" placeholder="Phone number" initialValue={this.props.user.phone}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave />
                <TextField type="email" name="email" placeholder="Email address" initialValue={this.props.user.email}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave />
            </div>
        );
    }
}

class SocialMedia extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id="social-media">
                <h2>Social Network</h2>

                <TextField type='url' name='socialnetworks.facebook' placeholder='Facebook profile URL'
                    initialValue={this.props.user.socialnetworks.facebook} onChange={asyncFieldUpdate.bind(this)} />

                <TextField name='socialnetworks.twitter' placeholder="Twitter account name, without the '@'"
                    initialValue={this.props.user.socialnetworks.twitter} onChange={asyncFieldUpdate.bind(this)} />

                <TextField name='socialnetworks.googleplus' placeholder='Google Plus username'
                    initialValue={this.props.user.socialnetworks.googleplus} onChange={asyncFieldUpdate.bind(this)} />

                <TextField name='socialnetworks.instagram' placeholder="Instagram account name, without the '@'"
                    initialValue={this.props.user.socialnetworks.instagram} onChange={asyncFieldUpdate.bind(this)} />
            </div>
        );
    }
}

const PaymentInfo = props => {
    return (
        <div id="payment-info">
            <h2>Payment Information</h2>

            <SelectField name='currency' placeholder='Payment Currency' initialValue={props.user.currency || 'CAD'} 
                            options={[{ value: 'CAD' }, { value:'USD' }]} 
                           onChange={props.onChange.bind(this)} endpoint="/me/updateOneField" autosave />
        </div>
    )
}

class PasswordResetForm extends Component {
    constructor(props) {
        super(props);

        this.inputValues = {};
    }

    updatePasswordField(name, value) {
        this.inputValues[name] = value;
    }

    changePassword(done) {
        if (this.inputValues.oldpassword && this.inputValues.newpassword
            && this.inputValues.newpassword == this.inputValues.confirmnewpassword) {
                API.post('/me/updatePassword', { old: this.inputValues.oldpassword, new: this.inputValues.newpassword }, (err, data) => {
                    if (!err && data.updated) {
                        castNotification({ title: 'Password updated', message: 'Successfully updated your password!', type: 'success' });
                    } else if (!err && !data.updated) {
                        castNotification({ title: 'Error updating password', message: 'The provided old password is not the good one.', type: 'warning' }); 
                    }

                    done && done();
                });
        } else {
            castNotification({
                title: 'Error updating password',
                message : 'The two new passwords must match, and the old password must be correct.',
                type: 'warning'
            });
            done && done();
        }
    }

    render() {
        return (
            <div id="password-reset-form">
                <h2>Password</h2>

                <p>If you ever forget your password, you can always click on "I have no idea what my password is" on the login page, and request a reset code via SMS. In order to receive the SMS, make sure you provided your phone number</p>
                <p>For <b>security</b> reasons, it's always a good practice to change your password on a regular basis.</p>
                
                <TextField type='password' name='oldpassword' placeholder='Current password'
                        onChange={this.updatePasswordField.bind(this)} />
                <TextField type='password' name='newpassword' placeholder='New password'
                        onChange={this.updatePasswordField.bind(this)} />
                <TextField type='password' name='confirmnewpassword' placeholder='Confirm new password'
                        onChange={this.updatePasswordField.bind(this)} />

                <ButtonWorker text='Change my password' work={this.changePassword.bind(this)} theme='purple' type='fill' />
            </div>
        );
    }
}

class Manage2FAForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            confirmed2fa: this.props.user.confirmed2fa,
            qrCode: '',
            token2fa: '',
        };
    }

    componentDidMount() {
        API.get('/2fa', {}, (err, data) => {
            if (!err && data) {
                this.setState({ qrCode: data.qrCode });
                log('ProfilePage', 'Got 2FA QRCode', 'success');
            } else {
                log('ProfilePage', 'Error fetching 2FA QRCode for Google Authnticator', 'error');
            }
        });
    }
    

    activate2fa(done) {
        API.post('/2fa/activate', {token2fa: this.state.token2fa}, (err, data, r) => {
            if (!err && r.status == 200) {
                this.setState({ confirmed2fa: true });
                log('ProfilePage', 'Activated 2FA', 'success');
                castNotification({
                    type : "success",
                    title : "2-factor authentication",
                    message : "Your account is now protected by a 2-factor authentication login."
                })
            } else {
                log('ProfilePage', 'Error activating 2FA', 'error');
                castNotification({
                    type : "warning",
                    title : "2-factor authentication",
                    message : "The provided 6 digit number is invalid."
                })
            }

            done && done();
        });
    }

    deactivate2fa(done) {
        API.post('/2fa/deactivate', {token2fa: this.state.token2fa}, (err, data, r) => {
            if (!err && r.status == 200) {
                this.setState({ confirmed2fa: false });                
                log('ProfilePage', 'Deactivated 2FA', 'success');
                castNotification({
                    type : "success",
                    title : "2-factor authentication",
                    message : "Your account no longer requires 2-factor authentication."
                })
            } else {
                log('ProfilePage', 'Error Deactivating 2FA', 'error');
                castNotification({
                    type : "warning",
                    title : "2-factor authentication",
                    message : "Could not deactivate 2-factor authentation for your account."
                })
            }

            done && done();
        });
    }

    render() {
        return (
            <div>
                <h2>2-Factor Authentication</h2>
                <p>
                    Two Factor Authentication, '2FA' for short, is an extra layer of security you can apply on your Lilium account.
                    It works by requiring that you provide a 6 digits code displayed by your smartphone in addition to your password when you login.
                </p>
                <p>To get started, follow these few steps :</p>
                <div class="c2fa-flex">
                    <ol>
                        <li>
                            Install the Google Authenticator application on your smartphone, the application is available on 
                            <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en" target='_blank'> Android </a>
                            and on <a href="https://itunes.apple.com/ca/app/google-authenticator/id388497605?mt=8" target='_blank'>iOS</a>.
                        </li>
                        <li>Inside Google Authenticator, tap the '+' icon to add an account.</li>
                        <li>Choose the 'Scan a barcode' option.</li>
                        <li>Center the QR Code displayed below in the designate area on your phone's screen, it will be detected automatically.</li>
                        <li>You should now see an account named 'Lilium CMS [company name] (username). with a correspponding string of 6 digits that refreshes every 30 seconds.</li>
                    </ol>

                    <figure>
                        <img src={this.state.qrCode} id="qr-code-2fa" alt="Something went wrong when displaying the 2FA QRCode" />
                    </figure>
                </div>

                <TextField name='token2fa' placeholder='Enter the 6 digits code' onChange={(name, value) => this.setState({ token2fa: value })} value={this.state.token2fa} />

                {
                    this.state.confirmed2fa ? (
                        <ButtonWorker text='Deactivate 2FA for my account'
                                theme='red' type='outline' work={this.deactivate2fa.bind(this)} />
                    ) : (
                        <ButtonWorker text='Activate 2FA for my account'
                                theme='purple' type='fill' work={ this.activate2fa.bind(this)} />
                    )
                }
            </div>
        );
    }
}
