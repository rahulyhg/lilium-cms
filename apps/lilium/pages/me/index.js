import { h, Component } from "preact";
import API from '../../data/api';
import { TextField, ButtonWorker } from '../../widgets/form';
import { ImagePicker } from '../../layout/imagepicker';

const style = {
    header: {
        backgroundColor: '#2d153b',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z' fill='%239c5ab7' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        color: 'white',
        padding: '25px',
        display: 'flex',
        flexWrap: 'nowrap'
    },

    profilePicture: {
        width: '250px',
        height: '250px',
        objectFit: 'cover',
        border: '2px solid white',
        borderRadius: '50%',
        backgroundColor: '#333',
        overflow: 'hidden',
        cursor: 'pointer',
        ':hover': {
            borderColor: 'red'
        }
    },

    profileInfoWrapper: {
        display: 'flex',
        flexDirection: 'column',
        margin: '0px 40px',
        padding: '0px 30px'
    },

    inputField: {
        fontWeight: '100',
        fontSize: '32px',
        color: 'white',
        backgroundColor: 'transparent',
        border: '0px',
        borderBottom: '0.5px ridge #9c5ab7',
        outlineColor: '#9c5ab7',
        padding: '4px 10px',
        margin: '8px'
    },

    textarea: {
        fontWeight: '200',
        fontSize: '16px',
        color: 'white',
        backgroundColor: 'transparent',
        border: '0px',
        borderBottom: '0.5px ridge #9c5ab7',
        outlineColor: '#9c5ab7',
        padding: '4px 10px',
        margin: '14px 8px 8px 8px',
        resize: 'none',
    },

    coreInfo: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    },

    badgesContainer: {
        display: 'flex',
        flexFlow: 'row wrap',
        justifyContent: 'space-around'
    },

    badgeImage: {
        maxHeight: '70px',
        maxWidth:'70px'
    },

    infoGroupTitle: {
        backgroundColor: '#9c5ab7',
        color: 'white',
        textTransform: 'uppercase',
        marginTop: '24px',
        padding: '6px'
    }
};


const asyncFieldUpdate = (name, value) => {
    API.post('/me/updateOneField', { field: name, value: value }, (err, data) => {
        if (!err)
            log('ProfilePage', 'Updated field ' + name, 'success');
        else
            log('ProfilePage', 'Error updating field ' + name, 'error');
    });
}

export default class ProfilePage extends Component {

    constructor(props) {
        super(props);

        this.inputValues = {};
        this.state = {
            user: undefined,
            err: undefined
        };
    }

    componentWillMount() {
        API.get('/entities/me', {}, (err, data) => {
            if (!err && data) {
                /// Remap social network for convenience
                let socialNetworks = data.user.socialnetworks;
                data.user.socialnetworks = {};
                for (let i = 0; i < socialNetworks.length; i++) {
                    data.user.socialnetworks[socialNetworks[i].network] = socialNetworks[i].username;
                }

                this.setState({ user: data.user, err: undefined });
            } else {
                this.setState({ err });
            }
        });
    }

    render() {
        if (this.state.user) {
            return (
                <div id="profile">
                    <ProfileHeader user={this.state.user} />
                    <div id="other-info" style={{margin: '14px'}}>
                        <ContactInfo user={this.state.user} />
                        <SocialMedia user={this.state.user} />

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

    asyncUpdateHeaderField(e) {
        asyncFieldUpdate(e.target.name, e.target.value);
    }

    /**
     * Returns the appropriate image name fot e given badge level
     * @param {number} level the level of the badge for which to return the image name
     */
    getBadgeImageName(level) {
        // All badges from level 6 and on have the '4.png' image
        return Math.min((Math.floor(level / 2) + 1), 4).toString() + ".png";
    }

    selectNewProfilePicture() {
        ImagePicker.cast({}, image => {
            if (image) {
                const avatarURL = image.sizes.square.url;
                API.post('/me/updateOneField', { field: "avatarURL", value: avatarURL }, (err, data) => {
                    if (!err) {
                        log('ProfilePage', 'Updated profile picture', 'success');

                        const user = this.state.user;
                        user.avatarURL = image.sizes.square.url;
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
            <div id="profile-header" style={style.header}>
                <div id="core-info" style={style.coreInfo}>
                    <div id="profile-picture-wrapper" style={style.coreInfo} >
                        <img src={this.state.user.avatarURL} id="profile-picture" style={style.profilePicture} onClick={this.selectNewProfilePicture.bind(this)} />
                    </div>
                    <h3 id="username" style={{ alignSelf: 'center' }}>{`@${this.state.user.username}`}</h3>
                </div>

                <div id="profile-info-wrapper" style={style.profileInfoWrapper}>
                    <input type="text" name="displayname" style={style.inputField} value={this.state.user.displayname}
                                onChange={this.asyncUpdateHeaderField.bind(this)} />
                    <input type="text" name="jobtitle" style={style.inputField} value={this.state.user.jobtitle || ''} placeholder='Job Title'
                                onChange={this.asyncUpdateHeaderField.bind(this)} />
                    <textarea name="description" className='change-placeholder' id="descriptichange-placeholderon" cols="30" rows="8" 
                                placeholder='Write a small introduction paragraph'
                                style={style.textarea}  onChange={this.asyncUpdateHeaderField.bind(this)}>{this.state.user.description}</textarea>
                </div>

                <div style={style.badgesContainer}>
                    {
                        this.props.user.badges.map(badge => {
                            return (
                                <span>
                                    <div class="me-decoration level-1" style="filter: hue-rotate(70deg);">
                                        <img src={`//narcity.localhost:8080/static/badges/${this.getBadgeImageName(badge.level)}`} style={style.badgeImage} />
                                        <i class="fa fa fa-key"></i>
                                    </div>
                                </span>
                            );
                        })
                    }
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
                <h2 style={style.infoGroupTitle}>Contact Information</h2>

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
                <h2  style={style.infoGroupTitle}>Social Network</h2>

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
                    done && done();
                });
        } else {
            done && done();
        }
    }

    render() {
        return (
            <div id="password-reset-form">
                <h2 style={style.infoGroupTitle}>Login Information</h2>

                <h2>Password</h2>

                <p>If you ever forget your password, you can always click on "I have no idea what my password is" on the login page, and request a reset code via SMS. In order to receive the SMS, make sure you provided your phone number</p>
                <p>For <b>security</b> reasons, it's always a good practice to change your password on a regular basis.</p>
                
                <TextField type='password' name='oldpassword' placeholder='Current password'
                        onChange={this.updatePasswordField.bind(this)} />
                <TextField type='password' name='newpassword' placeholder='New password'
                        onChange={this.updatePasswordField.bind(this)} />
                <TextField type='password' name='confirmnewpassword' placeholder='Confirm new password'
                        onChange={this.updatePasswordField.bind(this)} />

                <ButtonWorker text='Change my password' work={this.changePassword.bind(this)} />
            </div>
        );
    }
}

class Manage2FAForm extends Component {
    constructor(props) {
        super(props);
        this.staate = {
            confirmed2fa: this.props.user.confirmed2fa,
            qrCode: '',
            token2fa: ''
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
                console.log(err);
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

                <img src={this.state.qrCode} id="qr-code-2fa" alt="" />

                <TextField name='token2fa' placeholder='2FA Token' onChange={(name, value) => this.setState({ token2fa: value })} />

                <ButtonWorker text={`${(this.state.confirmed2fa) ? 'Deactivate' : 'Activate'} 2FA for my account`}
                        theme={(this.state.confirmed2fa) ? 'danger' : ''}
                        work={(this.state.confirmed2fa) ? this.deactivate2fa.bind(this) : this.activate2fa.bind(this)} />
            </div>
        );
    }
}
