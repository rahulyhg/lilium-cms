var filelogic = require('./filelogic.js');
var livevars = require('./livevars.js');
var db = require('./includes/db.js');
var formBuilder = require('./formBuilder');
var lmllib = require('./lmllib.js');
var log = require('./log.js');

var catAssoc = {};

var Category = function () {

    this.handleGET = function (cli) {
        cli.touch('article.handleGET');
        if (!cli.hasRightOrRefuse("list-categories")) { return; }

        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
            case 'edit':
                filelogic.serveAdminLML(cli, true);
                break;
            case 'list':
                filelogic.serveAdminLML(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
            }
        }
    };

    this.handlePOST = function (cli) {
        if (!cli.hasRight('edit-categories')) {
            cli.refresh();
            return;
        }

        switch (cli.routeinfo.path[2]) {
        case 'list':
            this.create(cli);
            break;
        case 'edit':
            this.edit(cli);
            break;
        case 'delete':
            this.delete(cli);
            break;
        default:
            return cli.throwHTTP(404, 'Not Found');
            break;

        }
    };

    this.edit = function (cli) {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);
        if (response.success) {
            var formData = formBuilder.serializeForm(form);

            // Create post
            db.update(cli._c, 'categories', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, formData, function (err, result) {
                // Generate LML page
                catAssoc[cli._c][formData.name] = formData.displayname;
                cli.refresh();
            });

        } else {
            cli.sendJSON({
                form: response
            });
        }
    };

    this.create = function (cli) {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);
        if (response.success) {
            var formData = formBuilder.serializeForm(form);

            // Create post
            db.insert(cli._c, 'categories', formData, function (err, result) {
                // Generate LML page
                catAssoc[cli._c][formData.name] = formData.displayname;
                cli.refresh();
            });

        } else {
            cli.sendJSON({
                form: response
            });
        }
    };

    this.delete = function (cli) {
        if (cli.postdata.data.id) {
            db.remove(cli._c, 'categories', {
                _id: db.mongoID(cli.postdata.data.id)
            }, function () {
                cli.sendJSON({
                    success: true
                });
            });
        } else {
            cli.refresh();
        }
    }

    this.preload = function(_c, cb) {
        log('Category', 'Preloading categories');
        catAssoc[_c.id] = new Object();
        var assoc = catAssoc[_c.id];

        db.findToArray(_c, 'categories', {}, function(err, arr) {
            arr.forEach(function(cc) {
                assoc[cc.name] = cc.displayname;
            });

            log('Category', 'Proloaded categories');
            cb(assoc);
        });
    };

    var getCatName = function(_c, slug) {
        return catAssoc[_c.id][slug] || slug;
    };

    this.getRawAssoc = function() {
        return catAssoc;
    };
        
    this.registerLMLLib = function() {
        log('Category', 'Registering LML lib');
        lmllib.registerContextLibrary('category', function(context) {
            return {
                getCatName : function(slug) { return getCatName(context.lib.config.default, slug); }
            }
        });
    };

    this.registerLiveVar = function () {
        livevars.registerLiveVariable('categories', function (cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                db.singleLevelFind(cli._c, 'categories', callback);
            } else if (levels[0] == "all") {
                var sentArr = new Array();
                db.findToArray(cli._c, 'categories', {}, function (err, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        sentArr.push({
                            articleid: arr[i]._id,
                            title: arr[i].title
                        });
                    };

                    callback(sentArr);
                });
            } else {
                db.multiLevelFind(cli._c, 'categories', levels, {
                    _id: db.mongoID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        });
    };
};

module.exports = new Category();
