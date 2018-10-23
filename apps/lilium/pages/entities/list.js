import { Component, h } from 'preact';
import { castNotification } from '../../layout/notifications';
import { BigList } from '../../widgets/biglist'
import { navigateTo } from '../../routing/link'
import * as entityLib from './lib'

class EntityListItemAdd extends Component {
    onClick() {
        alert('Not implemented');
        // castOverlay('create-entity');
    }

    render() {
        return (
            <div onClick={this.onClick.bind(this)} class="card flex create-new-entity-card">
                <div>
                    <i class="fal fa-plus"></i>
                </div>
                <div>
                    <b>Create entity</b>
                </div>
            </div>
        )
    }
}

class EntityListItem extends Component {
    constructor(props) {
        super(props);

        this.state = { user: this.props.item };
    }

    revokeAccess() {
        entityLib.revokeAccess(this.state.user, success => {
            if (success) {
                const user = this.state.user;
                user.revoked= true;
                this.setState({ user });
                castNotification({
                    type: 'warning',
                    title: `Access for user ${this.state.user.username} have been revoked`,
                    message: `Access for user ${this.state.user.username} have been revoked`
                });
            } else {
                castNotification({
                    type: 'err',
                    title: `Error revoking accesses for user ${this.state.user.username}`,
                    message: `Error revoking accesses for user ${this.state.user.username}. If this is an emergency, contact your network's administrator right away.`
                });
            }
        });
    }

    enableAccess() {
        entityLib.enableAccess(this.state.user, success => {
            if (success) {
                const user = this.state.user;
                user.revoked= false;
                this.setState({ user });
                castNotification({
                    type: 'success',
                    title: `Access for user ${this.state.user.username} have been restored`,
                    message: `Access for user ${this.state.user.username} have been restored`
                });
            } else {
                castNotification({
                    type: 'err',
                    title: `Error restoring accesses for user ${this.state.user.username}`,
                    message: `Error restoring accesses for user ${this.state.user.username}. If this is an emergency, contact your network's administrator right away.`
                });
            }
        });
    }

    enforce2FA() {
        entityLib.enforce2FA(this.state.user, success => {
            if (success) {
                const user = this.state.user;
                user.enforce2fa = true;
                this.setState({ user });
                castNotification({
                    type: 'success',
                    title: 'Enforced 2FA for user ' + this.state.user.username,
                    message: 'The user will have to set up 2FA on next login'
                });
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error enforcing 2FA for user ' + this.state.user.username,
                    message: 'Error enforcing 2FA for user ' + this.state.user.username
                });
            }
        });
    }

    deactivate2FA() {
        entityLib.deactivate2FA(this.state.user, success => {
            if (success) {
                const user = this.state.user;
                user.enforce2fa = false;
                user.confirmed2fa = false;
                this.setState({ user });
                castNotification({
                    type: 'warning',
                    title: 'Deactivated 2FA for user ' + this.state.user.username,
                    message: 'The user will no longer have to provide a 2FA token on login'
                });
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error deactivating 2FA for user ' + this.state.user.username,
                    message: 'Error deactivating 2FA for user ' + this.state.user.username
                });
            }
        });
    }

    forcePasswordReset() {
        entityLib.forcePasswordReset(this.state.user, success => {
            if (success) {
                const user = this.state.user;
                user.mustupdatepassword= true;
                this.setState({ user });
                castNotification({
                    type: 'success',
                    title: 'Forced password reset on next login for user' + this.state.user.username,
                    message: 'Forced password reset on next login for user' + this.state.user.username
                });
            } else {
                castNotification({
                    type: 'err',
                    title: 'Error forcing password reset for user ' + this.state.user.username,
                    message: 'Error forcing password resetr for user ' + this.state.user.username
                });
            }
        });
    }

    render() {
        return (
            <div class="card flex">
                <div class="image-wrapper">
                    <img src={this.state.user.avatarURL} alt={`${this.state.user.displayname}'s profile picture`} className="profile-picture"/>
                </div>

                <div class="detail-head">
                    <div class="big">
                        {this.state.user.displayname}
                    </div>
                </div>
                <div className="detail-list">
                    <div>@{this.state.user.username}</div>
                    <div>{this.state.user.phone || 'No hpone number to show'}</div>
                    <div>{this.state.user.email || 'No email to show'}</div>
                </div>
                <footer>
                    <span class="clickable" title="Edit User Information and manage accesses" onClick={() => { navigateTo('/entities/edit/' + this.state.user._id) }}>
                        Edit
                    </span>
                    <span className={"clickable light" + ((this.state.user.mustupdatepassword) ? 'success' : '')} title="Force password reset on next login" onClick={this.forcePasswordReset.bind(this)}>
                        Force password reset
                    </span>
                    {
                        (this.state.user.enforce2fa) ? (
                            <span className="clickable red light" title="Disable 2FA" onClick={this.deactivate2FA.bind(this)}>
                                2FA
                            </span>
                        ) : (
                            <span className="clickable light" title="Enforce 2FA" onClick={this.enforce2FA.bind(this)}>
                                2FA                                
                            </span>
                        )
                    }
                    {
                        (this.state.user.revoked) ? (
                            <span className={"clickable success light"} title="Reinstate User" onClick={this.enableAccess.bind(this)}>
                                <i className="fal fa-lock"></i>
                            </span>
                        ) : (
                            <span className={"clickable red light"} title="Revoke User" onClick={this.revokeAccess.bind(this)}>
                                <i className="fal fa-lock"></i>
                            </span>
                        )
                    }
                </footer>
            </div>
        )
    }
}

export default class Entities extends Component {
    constructor(props) {
        super(props);

        this.state = { entities: [] };
    }

    static get TOOLBAR_CONFIG() {
        return {
            id : "entities",
            title : "Filters",
            fields : [
                { type : "text", name : "search", title : "Search by name" },
                { type : "select", name : "status", title : "Status", options : [
                    { value : "not-revoked", text : "Active" },
                    { value : "revoked", text : "Revoked" },
                    { value : "All", text : "All statuses" },
                ] },
                { type : "select", name : "sort", title : "Sort", options : [
                    { value : "displayname-az", text : "Alphabetical" },
                    { value : "displayname-za", text : "Alphabetical Reversed" },
                    { value : "latest-logged", text : "Login Time" },
                    { value : "newest", text : "Newest" },
                    { value : "oldest", text : "Oldest" },
                ] }
            ]
        };
    }

    render() {
        return (
            <div id="entities">
                <BigList listitem={EntityListItem} addComponent={EntityListItemAdd} endpoint='/entities/bunch' toolbar={Entities.TOOLBAR_CONFIG} />
            </div>
        )
    }
}
