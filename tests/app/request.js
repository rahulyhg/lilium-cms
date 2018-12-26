const requestLib = require('request');

class Request {
    static get defaultOptions() {
        return {
            
        };
    }

    constructor(displayname, opt = {}) {
        this.displayname = displayname;
        this.options = Object.assign(Request.defaultOptions, opt);
    }

    to(method, url) {
        this.method = method;

        if (typeof url == "function") {
            this.makeURL = url;
        } else {
            this.url = url;
        }
        return this;
    }

    as(user) {
        this.user = user;
        return this;
    }

    withRight(right) {
        this.right = right;
        return this;
    }

    expect(predicate) {
        this.predicate = predicate;
        return this;
    }

    setPostData(data) {
        this.data = data;
        return this;
    }

    send(then) {
        const req = {
            url : "http://localhost:8080" + (this.url || (this.makeURL ? this.makeURL() : "") || "/"),
            method : this.method,
            headers : {},
            json : true
        };

        if (this.data) {
            req.body = this.data;
        }

        this.user && (req.headers["x-as"] = this.user);
        this.right && (req.headers["x-right"] = this.right);

        l(this.displayname, '#'); 
        l(`Sending ${this.method} request to ${req.url}`, '#');
        requestLib(req, (err, r, body) => {
            if (err) {
                l(`Error handling request ${err}`, '-');
                then(false);                 
            } else {
                l(`[${r.statusCode}] Response from Lilium request to ${this.method} ${req.url}`, '>', true);

                if (this.predicate) {
                    then(this.predicate(err, r, body));
                } else {
                    then(r.statusCode == 200);
                }
            }
        });
    }
}
module.exports = Request;
