const entities = require('../lib/entities.js');
const db = require('../lib/db.js');

class ClientObject {
    constructor(req, resp) {
        this.createdAt = this.createdon = new Date();
        this.request = req;
        this.response = resp;
        this.ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
        this.method = req.method;
        this.nodes = ['clientobject.new'];
        this.liliumlanguage = req.headers["x-lml-language"] || "english";
        this.cookies = {};
        this.session = {};
        this.userinfo = {};
        this.extra = {};

        this.routeinfo = {
            admin: false,
            login: false,
            livevars: false,
            front : false,
            root: false,
            isStatic: false,
            params: [],
            path: [],
            fullpath: "",
            fileExt: ""
        };

        this.responseinfo = {
            filecreated: false,
            cachedfile: false
        };

        this.parseCookie();
        this.setID();
    }

    did (cat, type, extra, cb) {
        cb && cb();
    };

    me () {
        return db.mongoID(this.userinfo.userid);
    };

    reloadSession (cb) {
        require('../session.js').reloadSession(this, cb);
    };

    throwHTTP  (code, message, hard, headers) {
        this.responseinfo.httpcode = code;
        this.responseinfo.httpmessage = message;
       
        code >= 400 && log('ClientObject', code + ' => ' + (this._c ? this._c.server.url : "//") + this.routeinfo.fullpath + " from " + this.ip + " with agent " + this.request.headers["user-agent"], 'info');

        this.response.writeHead(code, headers);
        this.response.end(message || undefined);
    };

    debug  () {
        this.response.writeHead(200);
        this.response.write(JSON.stringify({
            routeinfo: this.routeinfo,
            userinfo: this.userinfo,
            responseinfo: this.responseinfo,
            method: this.method,
            postdata: this.postdata,
            nodes: this.nodes,
            time: {
                created: this.createdon,
                served: new Date(),
                total: new Date() - this.createdon
            }
        }));
        this.response.end();
    };

    refresh  () {
        this.redirect(this.routeinfo.fullpath);
    };

    refuse () {
        this.throwHTTP(403);
    };

    hasRightOrRefuse (right) {
        if (this.hasRight(right)) {
            return true;
        } else {
            this.refuse();
            return false;
        }
    };

    readPostData(done, max = 2e+7) {
        if (this.postdata && this.postdata.data) {
            return done(this.postdata.data);
        }

        this.postdata = {raw : ""};

        let length = 0;
        this.request.on('data', (c) => { 
            this.postdata.raw += c; 
            length += c.length;  

            if (length > max) {
                this.throwHTTP(413, undefined, true);
            }
        });
        this.request.on('end', () => {
            try {
                this.postdata.data = JSON.parse(this.postdata.raw);
            } catch (ex) {
                this.postdata.data = this.postdata.raw;
            }

            done(this.postdata.data);
        });
    }

    sendHTML (content, code) {
        this.response.writeHead(code || 200, {
            "Content-Type" : "text/html",
            "Lilium-Proto" : "LML3"
        });
        
        this.response.end(content);
    }

    sendText (text) {
        this.response.writeHead(200, {
            "Content-Type" : "text/plain",
            "Lilium-Proto" : "livevars"
        });

        this.response.end(text);
    }

    sendJSON  (json, cheaders) {
        if (typeof json === 'object') {
            json = JSON.stringify(json);
        }

        var headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Lilium-Proto": "livevars"
        }

        if (this.cors) {
            headers["Access-Control-Allow-Origin"] = this.request.headers.origin || (this._c.server.protocol + this._c.server.url);
            headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
            headers["Access-Control-Allow-Header"] = "lmltoken, corsorigin, lmlterms, lmltopic, lmlaid, lmlqid";
        }

        if (cheaders) {
            Object.assign(headers, cheaders);
        }

        this.response.writeHead(200, headers);
        this.response.end(json);
    };

    touch  (str) {
        this.nodes.push(str);
    };

    hasRight  (right) {
        return this.userinfo.loggedin && entities.isAllowed(this.userinfo, right);
    }

    hasAPIRight (right) {
        return this.apisession && (this.apisession.rights.includes(right) || this.apisession.rights.includes('admin'));
    }

    isGranted  (role) {
        var isGranted = false;
        if (typeof this.userinfo.roles !== 'undefined' && (
                this.userinfo.roles.indexOf('lilium') != -1 ||
                this.userinfo.roles.indexOf('admin') != -1 ||
                this.userinfo.roles.indexOf(role) != -1)) {
            isGranted = true;
        }
        return isGranted;
    }

    isLoggedIn  () {
        return this.userinfo.loggedin;
    }

    redirect  (path, perm, hash) {
        if (this.routeinfo.params.async) {
            path += (path.indexOf('?') === -1 ? "?" : "&") + "async=*";
            log('ClientObject', "Redirecting with async param : " + path);
        }

        if (hash) {
            path += (path.indexOf('?') === -1 ? "?" : "&") + hash;
        }

        this.response.writeHead(perm ? 301 : 302, {
            'Location': path
        });
        this.response.end();
    };

    crash(ex = {}) {
        log('ClientObject', 'Crash handled with error : ' + ex, 'info');

        if (this._c && this._c.env == "prod") {
            log('ClientObject', 'Sending 500', 'info');
            console.log(ex.stack);
            this.throwHTTP(500, 'Lilium Internal Server Error', true);
        } else {
            log('ClientObject', 'Compiling LML3 crash page', 'info');
            require('../lml3/compiler').compile(
                this._c, 
                require('path').join(liliumroot, 'backend', 'dynamic', 'crash.lml3'),
                { error : ex },
            markup => {
                this.response.writeHead(500, { 'Content-Type' : 'text/html' });
                this.response.end(markup);
            });
        }
    };

    parseCookie  () {
        var cookieString = this.request.headers.cookie;
        var that = this;

        if (cookieString) {
            cookieString.split(';').forEach(cookie => {
                var keyVal = cookie.split('=');
                var keyName = keyVal.shift().trim();

                try {
                    keyVal = decodeURI(keyVal.join('=').trim());
                } catch (ex) {
                    log('ClientObject', 'Malformed cookie', 'warn');
                    return this.throwHTTP(400, 'That is one weird cookie.', true);
                }

                if (!that.cookies[keyName]) {
                    that.cookies[keyName] = keyVal;
                } else if (that.cookies[keyName] === 'object') {
                    that.cookies[keyName].push(keyVal);
                } else {
                    var str = that.cookies[keyName];
                    that.cookies[keyName] = [str, keyVal];
                }
            });
        }
    };

    setID () {
        this.id = Math.random().toString().slice(2) + new Date().getTime();
    };

    bindEnd (cb) {
        var that = this;
        this.response.on('finish', function() {
            that.requestduration = new Date() - that.createdAt;
            cb(that);
        });
    };
}

module.exports = ClientObject;
