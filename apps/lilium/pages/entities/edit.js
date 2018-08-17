import { Component, h } from 'preact';
import API from '../../data/api';
import { Spinner } from '../../layout/loading'
import { TextField, MultitagBox, MultiSelectBox } from '../../widgets/form'
import { castNotification } from '../../layout/notifications';
import * as entityLib from './lib'

export default class Entity extends Component {
    constructor(props) {
        super(props);

        this.state = { loading: true, entity: {} };
    }

    componentDidMount() {
        API.getMany(
            [{ endpoint:'/entities/single/' + this.props.entityId }, { endpoint: '/sites/all/simple' }, { endpoint: '/role' }],
            (err, data) => {
                if (Object.values(err).filter(x => x).length == 0) {
                    this.setState({
                        loading: false,
                        entity: data['/entities/single/' + this.props.entityId].entity,
                        roles: data['/role'].map(r => { return { displayName: r.displayname, value: r.name } }),
                        sites: data['/sites/all/simple'].map(s => { return { displayName: s.displayName, value: s.name } })
                    });
                } else {
                    log('Entities.edit', 'Error fetching the requested entity', 'err');
                }
            }
        );
    }

    revokeAccess() {
        entityLib.revokeAccess(this.state.entity, success => {
            if (success) {
                const user = this.state.entity;
                user.revoked= true;
                this.setState({ user });
                castNotification({
                    type: 'warning',
                    title: `Access for user ${this.state.entity.username} have been revoked`,
                    message: `Access for user ${this.state.entity.username} have been revoked`
                });
            } else {
                castNotification({
                    type: 'err',
                    title: `Error revoking accesses for user ${this.state.entity.username}`,
                    message: `Error revoking accesses for user ${this.state.entity.username}. If this is an emergency, contact your network's administrator right away.`
                });
            }
        });
    }

    enableAccess() {
        entityLib.enableAccess(this.state.entity, success => {
            if (success) {
                const user = this.state.entity;
                user.revoked= false;
                this.setState({ user });
                castNotification({
                    type: 'success',
                    title: `Access for user ${this.state.entity.username} have been restored`,
                    message: `Access for user ${this.state.entity.username} have been restored`
                });
            } else {
                castNotification({
                    type: 'err',
                    title: `Error restoring accesses for user ${this.state.entity.username}`,
                    message: `Error restoring accesses for user ${this.state.entity.username}. If this is an emergency, contact your network's administrator right away.`
                });
            }
        });
    }

    enforce2FA() {
        entityLib.enforce2FA(this.state.entity, success => {
            if (success) {
                const user = this.state.entity;
                user.enforce2fa = true;
                this.setState({ user });
                castNotification({
                    type: 'success',
                    title: 'Enforced 2FA for user ' + this.state.entity.username,
                    message: 'The user will have to set up 2FA on next login'
                });
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error enforcing 2FA for user ' + this.state.entity.username,
                    message: 'Error enforcing 2FA for user ' + this.state.entity.username
                });
            }
        });
    }

    deactivate2FA() {
        entityLib.deactivate2FA(this.state.entity, success => {
            if (success) {
                const user = this.state.entity;
                user.enforce2fa = false;
                user.confirmed2fa = false;
                this.setState({ user });
                castNotification({
                    type: 'warning',
                    title: 'Deactivated 2FA for user ' + this.state.entity.username,
                    message: 'The user will no longer have to provide a 2FA token on login'
                });
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error deactivating 2FA for user ' + this.state.entity.username,
                    message: 'Error deactivating 2FA for user ' + this.state.entity.username
                });
            }
        });
    }

    forcePasswordReset() {
        entityLib.forcePasswordReset(this.state.entity, success => {
            if (success) {
                const user = this.state.entity;
                user.mustupdatepassword= true;
                this.setState({ user });
                castNotification({
                    type: 'success',
                    title: 'Forced password reset on next login for user' + this.state.entity.username,
                    message: 'Forced password reset on next login for user' + this.state.entity.username
                });
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error forcing password reset for user ' + this.state.entity.username,
                    message: 'Error forcing password resetr for user ' + this.state.entity.username
                });
            }
        });
    }

    updateEntity(name, value) {
        const payload = {};
        payload[name]= value;
        API.post('/entities/edit/' + this.state.entity._id, payload, (err, data, r) => {
            if (r.status == 200) {
                castNotification({
                    type: 'success',
                    title: 'Updated field ' + name,
                    message: 'Updated field ' + name
                })
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error updating field ' + name,
                    message: 'Error updating field ' + name
                })
            }
        });
    }

    render() {
        if (!this.state.loading) {
            return (
                <div id="entities"> 
                    <h1>Edit</h1>
                    <div id="info" style={{ width: '75vw', margin: '0 auto', display: 'flex' }}>
                        <div id="profile-card" style={{ flexGrow: '300px 0 0' }}>
                            <img src={this.state.entity.avatarURL} alt={`${this.state.entity.displayname}'s profile picture`} className="profile-picture" style={{ display: 'block' }} />
                            <div className="actions light" style={{ backgroundColor: '#674a82' }}>
                                <div className={"action " + ((this.state.entity.mustupdatepassword) ? 'success' : '')} title="Force password reset on next login" onClick={this.forcePasswordReset.bind(this)}>
                                    <i className="fal fa-sync"></i>
                                </div>
                                {
                                    (this.state.entity.enforce2fa) ? (
                                        <div className="action danger" title="DIsable 2FA" onClick={this.deactivate2FA.bind(this)}>
                                            <span>2FA</span>
                                        </div>
                                    ) : (
                                        <div className="action success" title="Enforce 2FA" onClick={this.enforce2FA.bind(this)}>
                                            <span>2FA</span>
                                        </div>
                                    )
                                }
                                {
                                    (this.state.entity.revoked) ? (
                                        <div className={"action success"} title="Reinstate User" onClick={this.enableAccess.bind(this)}>
                                            <i className="fal fa-lock"></i>
                                        </div>
                                    ) : (
                                        <div className={"action danger"} title="Revoke User" onClick={this.revokeAccess.bind(this)}>
                                            <i className="fal fa-lock"></i>
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                        <div id="EditFields" style={{ flexGrow: '1', margin: '0px 40px' }}>
                            <TextField name='displayname' initialValue={this.state.entity.displayname} placeholder='Display Name' onChange={this.updateEntity.bind(this)} />
                            <TextField name='username' initialValue={this.state.entity.username} placeholder='Username' onChange={this.updateEntity.bind(this)} />
                            <TextField name='email' initialValue={this.state.entity.email} placeholder='Email address' type='email' onChange={this.updateEntity.bind(this)} />
                            <TextField name='phone' initialValue={this.state.entity.phone} placeholder='Phone number' type='phone' onChange={this.updateEntity.bind(this)} />
                            <MultiSelectBox name='roles' options={this.state.roles} initialValue={this.state.entity.roles} placeholder='Roles' onChange={this.updateEntity.bind(this)} />
                            <MultiSelectBox name='sites' options={this.state.sites} initialValue={this.state.entity.sites} placeholder='Sites' onChange={this.updateEntity.bind(this)} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <Spinner />
            );
        }
    }
}
