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

export default class ProfilePage extends Component {

    constructor(props) {
        super(props);

        this.inputValues = {};
        this.state = {
            user: undefined,
            qrCode: '',
            token2fa: '',
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

                API.get('/2fa', {}, (err, data) => {
                    if (!err && data) {
                        this.setState({ qrCode: data.qrCode });
                        log('ProfilePage', 'Got 2FA QRCode', 'success');
                    } else {
                        log('ProfilePage', 'Error fetching 2FA QRCode for Google Authnticator', 'error');
                    }
                });
            } else {
                this.setState({ err });
            }
        });
    }

    asyncFieldUpdate(name, value) {
        API.post('/me/updateOneField', { field: name, value: value }, (err, data) => {
            if (!err)
                log('ProfilePage', 'Updated field ' + name, 'success');
            else
                log('ProfilePage', 'Error updating field ' + name, 'error');
        });
    }

    asyncUpdateHeaderField(e) {
        this.asyncFieldUpdate(e.target.name, e.target.value);
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
                        log('ProfilePage', 'Error updating profile picture', 'error');
                    }
                });
            }
        });
    }

    activate2fa(done) {
        API.post('/2fa/activate', {token2fa: this.state.token2fa}, (err, data) => {
            if (!err) {
                const user = this.state.user;
                user.confirmed2fa = true;
                this.setState({ user });
                log('ProfilePage', 'Activated 2FA', 'success');
                done && done();
            }
        });
    }

    deactivate2fa(done) {
        API.post('/2fa/deactivate', {token2fa: this.state.token2fa}, (err, data) => {
            if (!err) {
                const user = this.state.user;
                user.confirmed2fa = false;
                this.setState({ user });
                log('ProfilePage', 'Deactivated 2FA', 'success');
                done && done();
            }
        });
    }

    /**
     * Returns the appropriate image name fot e given badge level
     * @param {number} level the level of the badge for which to return the image name
     */
    getBadgeImageName(level) {
        // All badges from level 6 and on have the '4.png' image
        return Math.min((Math.floor(level / 2) + 1), 4).toString() + ".png";
    }

    /**
     * Returns a font awesome class in the form of 'fa-icon' from the classlist of a badge
     * @param {string} classes string classes list returned from the server
     */
    getFonwAwesomeClass(classes) {

    }

    render() {
        if (this.state.user) {
            return (
                <div id="profile">
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
                                this.state.user.badges.map(badge => {
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
                    <div id="other-info" style={{margin: '14px'}}>
                        <div id="contact-info">
                            <h2 style={style.infoGroupTitle}>Contact Information</h2>

                            <TextField type="tel" name="phone" placeholder="Phone number" initialValue={this.state.user.phone}
                                            onChange={this.asyncFieldUpdate.bind(this)} />
                            <TextField type="email" name="email" placeholder="Email address" initialValue={this.state.user.email}
                                            onChange={this.asyncFieldUpdate.bind(this)} />
                        </div>
                        <div id="social-media">
                            <h2  style={style.infoGroupTitle}>Social Network</h2>

                            <TextField type='url' name='socialnetworks.facebook' placeholder='Facebook profile URL'
                                initialValue={this.state.user.socialnetworks.facebook} onChange={this.asyncFieldUpdate.bind(this)} />

                            <TextField name='socialnetworks.twitter' placeholder="Twitter account name, without the '@'"
                                initialValue={this.state.user.socialnetworks.twitter} onChange={this.asyncFieldUpdate.bind(this)} />

                            <TextField name='socialnetworks.googleplus' placeholder='Google Plus username'
                                initialValue={this.state.user.socialnetworks.googleplus} onChange={this.asyncFieldUpdate.bind(this)} />

                            <TextField name='socialnetworks.instagram' placeholder="Instagram account name, without the '@'"
                                initialValue={this.state.user.socialnetworks.instagram} onChange={this.asyncFieldUpdate.bind(this)} />
                        </div>
                        <div id="login-info">
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

                            <hr/>

                            <h2>Two Factor Authentication</h2>
                            <p>
                                Two Factor Authentication, '2FA' for short, is an extra layer of security you can apply on your Lilium account.
                                 It works by requiring that you provide a 6 digits code displayed by your smartphone in addition to your password when you login.
                            </p>
                            <p>To get started, follow these few steps :</p>
                            <ol>
                                <li>I
                                    nstall the Google Authenticator application on your smartphone, the application is available on 
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

                            <ButtonWorker text={`${(this.state.user.confirmed2fa) ? 'Deactivate' : 'Activate'} 2FA for my account`}
                                            theme={(this.state.user.confirmed2fa) ? 'danger' : ''}
                                            work={(this.state.user.confirmed2fa) ? this.deactivate2fa.bind(this) : this.activate2fa.bind(this)} />
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
