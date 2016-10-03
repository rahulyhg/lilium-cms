var Admin = require('./backend/admin.js');
var log = require('./log.js');
var db = require('./includes/db.js');
var filelogic = require('./filelogic.js');

var Tools = function() {};
Tools.prototype.tools = {};

Tools.prototype.handleGET = function(cli) {
    for (var n in this.tools) {
        if (this.tools[n].name === n) {
            var t = this.tools[n];
            if (typeof t.get !== "function") {
                return false;
            } else {
                return t.get.apply(t, arguments);
            }
        } 
    }

};

Tools.prototype.handlePOST = function(cli) {
     for (var n in this.tools) {
        if (this.tools[n].name === n) {
            var t = this.tools[n];
            if (typeof t.post !== "function") {
                return false;
            } else {
                t.post.apply(t, arguments);
                return true;
            }
        } 
    }

    return false;
};

Tools.prototype.callToolLivevar = function(cli, levels, param, callback) {
    for (var n in this.tools) {
        if (this.tools[n].name === n) {
            var t = this.tools[n];
            if (typeof t.livevar !== "function") {
                return false;
            } else {
                t.livevar.apply(t, arguments);
                return true;
            }
        } 
    }

    return false;
};

Tools.prototype.listAllTools = function(cli, cb) {
    var pkg = [];

    for (var n in this.tools) {
        var t = this.tools[n];

        if (cli.hasRight(t.rights)) {
            pkg.push({
                name : t.name,
                displayname : t.displayname,
                url : cli._c.server.url + "/admin/tools/" + t.endpoint,
                endpoint : t.endpoint,
                icon : t.icon
            });
        }
    }

    cb(pkg);
};

Tools.prototype.registerLiveVar = function() {
    var that = this;
    require('./livevars.js').registerLiveVariable('tools', function(cli, levels, params, callback) {
        switch (levels[0]) {
            case undefined:
            case "list":
                that.listAllTools(cli, callback);
                break;

            default: 
                if (!that.callToolLivevar(cli, levels, params, callback)) {
                    callback(new Error("[LiveVariableException] Undefined level for tools live variable : " + levels[0]));
                }
        }
    });
};

Tools.prototype.registerAdminEndpoint = function() {
    var that = this;

    Admin.registerAdminEndpoint('tools', 'GET', function(cli) {
        cli.touch("tools.GET");
        if (!that.handleGET(cli)) {
            filelogic.serveAdminLML(cli);
        }
    });

    Admin.registerAdminEndpoint('tools', 'POST', function(cli) {
        cli.touch("tools.POST");
        if (!that.handlePOST(cli)) {
            cli.throwHTTP(404, "Not Found");
        }
    });
};

Tools.prototype.preloadTools = function(cb) {
    var that = this;
    log('Tools', 'Reading through all tools files');
    require('fs').readdir('./tools/', function(err, files) {
        if (err) {
            throw new Error("[FileAccessException] Could not access directory ./tools/");
        }

        for (var i = 0; i < files.length; i++) if (files[i].indexOf(".js") == files[i].length - 3) {
            var t = require('./tools/' + files[i]);

            if (t.name && t.displayname && t.rights && t.endpoint && t.icon) {
                log('Tools', 'Registering tool with display name : ' + t.displayname);
                that.tools[t.name] = t;

                if (typeof t.register === "function") {
                    t.register.apply(t, []);
                }
            } else {
                log('Tools', 'Failed to load tool with missing properties : ' + files[i]);
            }
        }

        cb();
    });
};

module.exports = new Tools();
