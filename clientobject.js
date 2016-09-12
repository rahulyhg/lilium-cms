var entities = require('./entities.js');
var log = require('./log.js');
var db = require('./includes/db.js');

var ClientObject = function (req, resp) {
    this.request = req;
    this.response = resp;
    this.method = req.method;
    this.createdon = new Date();
    this.postdata = undefined;
    this.nodes = ['clientobject.new'];
    this.cookies = new Object();
    this.session = new Object();
    this.userinfo = new Object();
    this._c = undefined;

    this.routeinfo = {
        admin: false,
        login: false,
        livevars: false,
        root: false,
        isStatic: false,
        params: [],
        path: [],
        fullpath: "",
        fileExt: ""
    };
    this.userinfo.dashaccess =
        this.userinfo.loggedin &&
        this.userinfo.admin ||
        this.userinfo.god ||
        entities.isAllowed(this.userinfo, 'dash');

    this.responseinfo = {
        filecreated: false,
        cachedfile: false
    };

    this.parseCookie();
    this.setID();
    this.createdAt = new Date();
};

ClientObject.prototype.throwHTTP = function (code, message) {
    this.responseinfo.httpcode = code;
    this.responseinfo.httpmessage = message;
    this.debug();
};

ClientObject.prototype.debug = function () {
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
            served: new Date()
        }
    }));
    this.response.end();
};

ClientObject.prototype.hasEnoughPower = function (power, cb) {
    var cli = this;
    // Check if role or number given
    if (typeof power === 'string') {
        db.findToArray(this._c, 'roles', {
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
        db.findToArray(this._c, 'roles', {
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

ClientObject.prototype.refresh = function () {
    this.redirect(this.routeinfo.fullpath);
};

ClientObject.prototype.refuse = function() {
    this.redirect("//" + this.routeinfo.rootdomain + "/admin/401?from=" + this.routeinfo.relsitepath, false);
};

ClientObject.prototype.hasRightOrRefuse = function(right) {
    if (this.hasRight(right)) {
        return true;
    } else {
        this.refuse();
        return false;
    }
};

ClientObject.prototype.sendJSON = function (json) {
    if (typeof json === 'object') {
        json = JSON.stringify(json);
    }
    this.response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Lilium-Proto": "livevars"
    });

    this.response.end(json);
};

ClientObject.prototype.touch = function (str) {
    this.nodes.push(str);
};

ClientObject.prototype.hasRight = function (right) {
    return this.userinfo.loggedin && entities.isAllowed(this.userinfo, right);
}

ClientObject.prototype.isGranted = function (role) {
    var isGranted = false;
    if (typeof this.userinfo.roles !== 'undefined' && (
            this.userinfo.roles.indexOf('lilium') != -1 ||
            this.userinfo.roles.indexOf('admin') != -1 ||
            this.userinfo.roles.indexOf(role) != -1)) {
        isGranted = true;
    }
    return isGranted;
}

ClientObject.prototype.hasEnoughPermission = function (minimumRole) {
    // Check minimumRole power and check client maximumRole
}

ClientObject.prototype.isLoggedIn = function () {
    return this.userinfo.loggedin;
}

ClientObject.prototype.redirect = function (path, perm) {
    if (this.routeinfo.params.async) {
        path += (path.indexOf('?') === -1 ? "?" : "&") + "async=*";
        log('ClientObject', "Redirecting with async param : " + path);
    }

    this.response.writeHead(perm ? 301 : 302, {
        'Location': path
    });
    this.response.end();
};

ClientObject.prototype.crash = function (ex) {
    log('ClientObject', 'Crash handled with error : ' + ex);

    try {
        var errFilePath = this._c.server.base + "/backend/dynamic/error.lml";
        this.routeinfo.isStatic = true;

        require('./filelogic.js').executeLMLNoCache(this, errFilePath, ex);
    } catch (ex) {
        log('ClientObject', 'Could not handle crash : ' + ex);
        this.response.end();
    }
};

ClientObject.prototype.parseCookie = function () {
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

ClientObject.prototype.setID = function() {
    this.id = Math.random().toString().slice(2) + new Date().getTime();
};

ClientObject.prototype.bindEnd = function(cb) {
    var that = this;
    this.response.on('finish', function() {
        that.requestduration = new Date() - that.createdAt;
        cb(that);
    });
};

module.exports = ClientObject;
