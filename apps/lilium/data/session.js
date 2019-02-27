export class LiliumSession {
    allowedEndpoints = [];
    rights = [];

    constructor(user) {
        user && this.setUser(user);
    }

    setUser(user) {
        Object.keys(user).forEach(k => { this[k] = user[k] });
        this.isAdmin = this.rights.includes('admin') || this.rights.includes('lilium');
    }

    addAllowedEndpoint(e) {
        this.allowedEndpoints.push(e);
    }

    addAllowedEndpoints(e) {
        this.allowedEndpoints.push(...e);
    }

    hasRight(right) {
        return this.isAdmin || this.rights.includes(right);
    }
}
