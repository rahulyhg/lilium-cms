import { h, Component } from 'preact';
import Modal from '../widgets/modal';
import { TextField, ButtonWorker } from '../widgets/form';
import { castNotification } from '../layout/notifications';
import API from '../data/api';

export class PasswordReset extends Component {
    constructor(props) {
        super(props);
        this.state = {
            shown : liliumcms.session.mustupdatepassword 
        }

        this.newpwd = "";
    }

    fieldChanged(name, value) {
        this.newpwd = value;
    }

    send(done) {
        if (!this.newpwd || this.newpwd.length < 6) {
            castNotification({
                type : "warning",
                title : "Invalid password",
                message : "The password must have at least 6 characters"
            });

            done();
        } else if (!this.newpwd.match(/[^a-z0-9]/)) {
            castNotification({
                type : "warning",
                title : "Invalid password",
                message : "The password must have a special character of a symbol"
            });

            done();
        } else {
            API.post('/me/updatePassword', { "new" : this.newpwd }, (err, json, r) => {
                if (err || !json.updated) {
                    castNotification({
                        type : "warning",
                        title : "Old password used",
                        message : "The password must be different than the old one"
                    });

                    done();
                } else {
                    castNotification({
                        type : "success",
                        title : "Password changed",
                        message : "Your password was successfully updated"
                    });

                    this.setState({ shown : false });
                    liliumcms.session.mustupdatepassword = false;
                    done();
                }
            });
        }
    }

    render() {
        if (!this.state.shown) {
            return null;
        }

        return (
            <Modal title="You must update your password" visible>
                <div>
                    In order to respect Lilium's password policy, your password must now be updated. Like pretty much any other website including Facebook and Google, the following requirements must be met :
                </div>
                <ul>
                    <li>Something you will remember</li>
                    <li>Different than the last one</li>
                    <li>At least 6 characters long</li>
                    <li>Contains at least one capital letter or symbol</li>
                </ul>
                <TextField placeholder="New password" onChange={this.fieldChanged.bind(this)} type="password" />
                <div>
                    <ButtonWorker theme="blue" text="Update" work={this.send.bind(this)} />
                </div>
            </Modal>
        );
    }
}
