const entities = require('./entities.js');
const log = require('./log.js');
const db = require('./includes/db.js');
const events = require('./events.js');

class ClientObject {
    constructor(req, resp) {
        this.createdAt = this.createdon = new Date();
        this.request = req;
        this.response = resp;
        this.ip = req.headers["x-real-ip"] || req.connection.remoteAddress;
        this.method = req.method;
        this.nodes = ['clientobject.new'];
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
        // events.register(this._c, cat, type, this.userinfo.user, extra, cb);
        cb && cb();
    };

    me () {
        return db.mongoID(this.userinfo.userid);
    };

    reloadSession (cb) {
        require('./session.js').reloadSession(this, cb);
    };

    throwHTTP  (code, message, hard, headers) {
        this.responseinfo.httpcode = code;
        this.responseinfo.httpmessage = message;
       
        code >= 400 && log('ClientObject', code + ' => ' + (this._c ? this._c.server.url : "//") + this.routeinfo.fullpath + " from " + this.ip + " with agent " + this.request.headers["user-agent"], 'info');

        if (hard) {
            this.response.writeHead(code, headers);
            this.response.end(message || undefined);
        } else if (code >= 400 && code < 500) {
            require('./filelogic.js').serveErrorPage(this, code);
        } else {
            this.debug();
        }
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

    hasEnoughPower  (power, cb) {
        var conf = require('./config.js');
        var cli = this;
        // Check if role or number given
        if (typeof power === 'string') {
            db.findToArray(conf.default(), 'roles', {
                name: power
            }, function (err, arr) {
                if (arr[0] && this.userinfo.power <= arr[0].power) {
                    cb(true);
                } else {
                    cb(false);
                }
            })
        } else if (!isNaN(power)) {
            cb(cli.userinfo.power <= power);
        } else {
            db.findToArray(conf.default(), 'roles', {
                name: {
                    '$in': power
                }
            }, function (err, arr) {
                if (err) {
                    cli.crash(err);
                }
                if (arr.length > 0) {
                    for (var index in arr) {
                        if (cli.userinfo.power > arr[index].power) {
                            cb(false);
                        }
                    }
                    cb(true);
                } else {
                    cb(false);
                }
            });
        }
    }

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

    readPostData(done) {
        if (this.postdata && this.postdata.data) {
            return done(this.postdata.data);
        }

        this.postdata = {raw : ""};

        this.request.on('data', (c) => { this.postdata.raw += c; });
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

    hasEnoughPermission  (minimumRole) {
        // Check minimumRole power and check client maximumRole
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

    crash  (ex) {
        log('ClientObject', 'Crash handled with error : ' + ex);

        if (false && this._c && this._c.env == "prod") {
            log('ClientObject', 'Sending 500');
            return this.throwHTTP(500, 'Lilium Internal Server Error', true);
        }

        try {
            var errFilePath = this._c.server.base + "/backend/dynamic/error.lml";
            this.routeinfo.isStatic = true;

            require('./filelogic.js').executeLMLNoCache(this, errFilePath, ex);
        } catch (ex) {
            log('ClientObject', 'Could not handle crash : ' + ex);
            this.response.end();
        }
    };

    parseCookie  () {
        var cookieString = this.request.headers.cookie;
        var that = this;

        if (cookieString) {
            cookieString.split(';').forEach(function (cookie) {
                var keyVal = cookie.split('=');
                var keyName = keyVal.shift().trim();
                keyVal = decodeURI(keyVal.join('=').trim());

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
