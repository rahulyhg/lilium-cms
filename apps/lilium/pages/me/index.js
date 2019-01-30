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
            { text : _v('general'), component : ProfileHeader } , 
            { text : _v('contactInfo'), component : ContactInfo }, 
            { text : _v('paymentInfo'), component : PaymentInfo }, 
            { text : _v('socialNetworks'), component : SocialMedia }, 
            { text : _v('password'), component : PasswordResetForm }, 
            { text : _v('twoFactorAuth'), component : Manage2FAForm }
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
                                <div class="me-header-badges-title">{_v('badges')}</div>
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
                    <h3>There was an error when trying to retrieve your user info, are you logged in?</h3>
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
                    <h2>{_v('general')}</h2>

                    <TextField name="displayname"  initialValue={this.state.user.displayname} value={this.state.user.displayname}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave placeholder={_v('fullName')} />

                    <TextField name="jobtitle" initialValue={this.state.user.jobtitle || ''} value={this.state.user.jobtitle} placeholder={_v('jobTitle')}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave   />

                    <TextField name="description" className='change-placeholder' id="descriptichange-placeholderon" 
                        placeholder={_v('writeIntro')} multiline={true} value={this.state.user.description}
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
                <h2>{_v('contactInfo')}</h2>

                <TextField type="tel" name="phone" placeholder={_v('phoneNumber')} initialValue={this.props.user.phone}
                        onChange={this.props.onChange.bind(this)} endpoint="/me/updateOneField" autosave />
                <TextField type="email" name="email" placeholder={_v('emailAddress')} initialValue={this.props.user.email}
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
                <h2>{_v('socialNetworks')}</h2>

                <TextField type='url' name='socialnetworks.facebook' placeholder={_v('facebookURL')}
                    initialValue={this.props.user.socialnetworks.facebook} onChange={asyncFieldUpdate.bind(this)} />

                <TextField name='socialnetworks.twitter' placeholder={_v('twitterName')}
                    initialValue={this.props.user.socialnetworks.twitter} onChange={asyncFieldUpdate.bind(this)} />

                <TextField name='socialnetworks.googleplus' placeholder={_v('googlePlusName')}
                    initialValue={this.props.user.socialnetworks.googleplus} onChange={asyncFieldUpdate.bind(this)} />

                <TextField name='socialnetworks.instagram' placeholder={_v('instagramName')}
                    initialValue={this.props.user.socialnetworks.instagram} onChange={asyncFieldUpdate.bind(this)} />
            </div>
        );
    }
}

const PaymentInfo = props => {
    return (
        <div id="payment-info">
            <h2>{_v('paymentInfo')}</h2>

            <SelectField name='currency' placeholder={_v('paymentCurrency')} initialValue={props.user.currency || 'CAD'} 
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
                <h2>{_v('password')}</h2>

                {_ev('passwordGuidelines')}
                
                <TextField type='password' name='oldpassword' placeholder={_v('currentPW')}
                        onChange={this.updatePasswordField.bind(this)} />
                <TextField type='password' name='newpassword' placeholder={_v('newPW')}
                        onChange={this.updatePasswordField.bind(this)} />
                <TextField type='password' name='confirmnewpassword' placeholder={_v('confirmPW')}
                        onChange={this.updatePasswordField.bind(this)} />

                <ButtonWorker text={_v('changePW')} work={this.changePassword.bind(this)} theme='purple' type='fill' />
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
                <h2>{_v('twoFactorAuth')}</h2>
                {_ev('presentation2FA')}
                <div class="c2fa-flex">
                    {_ev('getStarted2FA')}
                    <figure>
                        <img src={this.state.qrCode} id="qr-code-2fa" alt="Something went wrong when displaying the 2FA QRCode" />
                    </figure>
                </div>

                <TextField name='token2fa' placeholder={_v('enter6digits')} onChange={(name, value) => this.setState({ token2fa: value })} value={this.state.token2fa} />

                {
                    this.state.confirmed2fa ? (
                        <ButtonWorker text={_v('deactivate2FA')}
                                theme='red' type='outline' work={this.deactivate2fa.bind(this)} />
                    ) : (
                        <ButtonWorker text={_v("activate2FA")}
                                theme='purple' type='fill' work={ this.activate2fa.bind(this)} />
                    )
                }
            </div>
        );
    }
}
