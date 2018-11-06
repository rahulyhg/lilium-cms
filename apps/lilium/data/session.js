export class LiliumSession {
    allowedEndpoint = [];
    rights = [];

    constructor(user) {
        Object.keys(user).forEach(k => { this[k] = user[k] });
        this.isAdmin = this.rights.includes('admin') || this.rights.includes('lilium');
    }

    setAllowedEndpoints(arr) {
        this.allowedEndpoints = arr;
    }

    addAllowedEndpoint(e) {
        this.allowedEndpoints.push(e);
    }

    hasRight(right) {
        return this.isAdmin || this.rights.includes(right);
    }
}
