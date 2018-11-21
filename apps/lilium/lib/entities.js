import API from '../data/api';

export function revokeAccess(user, callback) {
    API.post('/entities/revoke/' + user._id, {}, (err, data, r) => {
        callback && callback(r.status == 200);
    });
}

export function enableAccess(user, callback) {
    API.post('/entities/restore/' + user._id, { address: user.email }, (err, data, r) => {
        callback && callback(r.status == 200);
    });
}

export function enforce2FA(user, callback) {
    API.post('/2fa/enforce2fa', { username: user.username }, (err, data, r) => {
        callback && callback(r.status == 200);
    });
}

export function deactivate2FA(user, callback) {
    API.post('/2fa/deactivate2faForUser', { username: user.username }, (err, data, r) => {
        callback && callback(r.status == 200);
    });
}

export function forcePasswordReset(user, callback) {
    API.post('/entities/mustUpdatePassword/' + user._id, {}, (err, data, r) => {
        callback && callback(r.status == 200);
    });
}
