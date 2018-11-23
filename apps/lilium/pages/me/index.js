import { h, Component } from "preact";
import API from '../../data/api';
import { TextField, ButtonWorker, SelectField } from '../../widgets/form';
import { Picker } from '../../layout/picker';
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

class UserBadge extends Component {
    getImageName() {
        return Math.min((Math.floor(this.props.badge.level / 2) + 1), 4).toString() + ".png";
    }

    render() {
        return (
            <span>
                <div class="me-decoration level-1" style={{filter: "hue-rotate("+( this.props.badge.level * 30 )+"deg)"}}>
                    <img src={`//narcity.localhost:8080/static/badges/${this.getImageName()}`} class="badge-image" />
                    <i class={this.props.badge.classes}></i>
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
            loading : true
        };
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

    render() {
        console.log('render', this.state);
        if (this.state.loading) {
            return (<Spinner />);
        }

        if (this.state.user) {
            return (
                <div id="profile">
                    <ProfileHeader user={this.state.user} />
                    <div id="other-info">
                        <ContactInfo user={this.state.user} />
                        <SocialMedia user={this.state.user} />
                        <PaymentInfo user={this.state.user} />

                        <div id="login-info">
                            <PasswordResetForm />
                            <hr/>
                            <Manage2FAForm user={this.state.user} />
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

    selectNewProfilePicture() {
        Picker.cast({ accept: ['uploads'] }, picked => {
            if (picked) {
                const avatarURL = picked.image.sizes.square.url;
                API.post('/me/updateOneField', { field: "avatarURL", value: avatarURL }, (err, data) => {
                    if (!err) {
                        log('ProfilePage', 'Updated profile picture', 'success');

                        const user = this.state.user;
                        user.avatarURL = picked.image.sizes.square.url;
                        this.setState({ user })
                    } else {
                        console.log(err);
                        log('ProfilePage', 'Error updating profile picture', 'error');
                    }
                });
            }
        });
    }
  
    render() {
        return (
            <div id="profile-header">
                <div id="core-info" >
                    <div id="profile-picture-wrapper" >
                        <img src={this.state.user.avatarURL} id="profile-picture" onClick={this.selectNewProfilePicture.bind(this)} />
                    </div>
                    <h3 id="username" style={{ alignSelf: 'center' }}>{`@${this.state.user.username}`}</h3>
                </div>

                <div id="me-badge-wrapper">
                    {
                        this.props.user.badges.map(badge => (
                            <UserBadge badge={badge} badges={this.props.badges} />
                        ))
                    }
                </div>

                <div id="profile-info-wrapper" >
                    <TextField name="displayname"  initialValue={this.state.user.displayname} value={this.state.user.jobtitle}
                        onChange={asyncFieldUpdate.bind(this)}  placeholder="Full name" />

                    <TextField name="jobtitle" initialValue={this.state.user.jobtitle || ''} value={this.state.user.jobtitle} placeholder='Job Title'
                        onChange={asyncFieldUpdate.bind(this)}   />

                    <TextField name="description" className='change-placeholder' id="descriptichange-placeholderon" 
                        placeholder='Write a small introduction paragraph' multiline={true} value={this.state.user.description}
                        onChange={asyncFieldUpdate.bind(this)} initialValue={this.state.user.description} />
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
                        onChange={asyncFieldUpdate.bind(this)} />
                <TextField type="email" name="email" placeholder="Email address" initialValue={this.props.user.email}
                        onChange={asyncFieldUpdate.bind(this)} />
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
                            options={[{ value: 'CAD' }, { value:'USD' }]} onChange={asyncFieldUpdate.bind(this)} />
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
                    if (!err) {
                        castNotification({ title: 'Password updated', message: 'Successfully updated your password!', type: 'success' });
                    } else {
                        castNotification({ title: 'Error updating password', message: 'Error updating password!', type: 'success' });                        
                    }

                    done && done();
                });
        } else {
            castNotification({
                title: 'Error updating password',
                message: "The 'current password', 'new password', and 'confirm new password' fields are mandatory and the 'new password' and 'confirm new password' fields must match",
                type: 'success'
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
        API.post('/2fa/activate', {token2fa: this.state.token2fa}, (err, data) => {
            if (!err) {
                this.setState({ confirmed2fa: true });
                log('ProfilePage', 'Activated 2FA', 'success');
                done && done();
            } else {
                console.log(err);
                log('ProfilePage', 'Error activating 2FA', 'error');
            }
        });
    }

    deactivate2fa(done) {
        API.post('/2fa/deactivate', {token2fa: this.state.token2fa}, (err, data) => {
            if (!err) {
                this.setState({ confirmed2fa: false });                
                log('ProfilePage', 'Deactivated 2FA', 'success');
                done && done();
            } else {
                log('ProfilePage', 'Error Deactivating 2FA', 'error');
            }
        });
    }

    render() {
        return (
            <div id="2fa-f">
                <h2>Two Factor Authentication</h2>
                <p>
                    Two Factor Authentication, '2FA' for short, is an extra layer of security you can apply on your Lilium account.
                    It works by requiring that you provide a 6 digits code displayed by your smartphone in addition to your password when you login.
                </p>
                <p>To get started, follow these few steps :</p>
                <ol>
                    <li>
                        Install the Google Authenticator application on your smartphone, the application is available on 
                        <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en" target='_blank'> Android </a>
                        and on <a href="https://itunes.apple.com/ca/app/google-authenticator/id388497605?mt=8" target='_blank'>iOS</a>.
                    </li>
                    <li>Inside Google Authenticator, tap the '+' icon to add an account.</li>
                    <li>Choose the 'Scan a barcode' option.</li>
                    <li>Center the QR Code displayed below in the designate area on your phone's screen, it will be detected automatically.</li>
                    <li>You should now see an account named 'Lilium CMS &gt;company name&lt; (&gt;username&lt;). with a correspponding string of 6 digits that refreshes every 30 seconds.</li>
                </ol>

                <img src={this.state.qrCode} id="qr-code-2fa" alt="Something went wrong when displaying the 2FA QRCode" />

                <TextField name='token2fa' placeholder='2FA Token' onChange={(name, value) => this.setState({ token2fa: value })} />

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
