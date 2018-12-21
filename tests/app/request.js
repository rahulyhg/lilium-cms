const requestLib = require('request');

class Request {
    static get defaultOption() {
        return {
            
        };
    }

    constructor(displayname, opt = {}) {
        this.options = Request.defaultOptions.assign(opt);
    }

    to(method, url) {
        this.method = method;
        this.url = url;
    }

    as(user) {
        this.user = user;
    }

    withRole(role) {
        this.role = role;
    }

    expect(predicate) {
        this.predicate = predicate;
    }

    setPostData(data) {
        this.data = data;
    }

    send(then) {
        const req = {
            url : this.url,
            method : this.method,
            headers : {}
        };

        if (this.data) {
            req.json = true;
            req.body = this.data;
        }

        this.user && (req.headers["x-as"] = this.user);
        this.role && (req.headers["x-role"] = this.role);

        requestLib(method, (err, data, r) => {
            if (this.predicate) {
                then(this.predicate(err, data, r));
            } else {
                then(r.status == 200);
            }
        });
    }
}

module.exports = Request;
