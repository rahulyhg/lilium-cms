var filelogic = require('./filelogic.js');
var livevars = require('./livevars.js');
var db = require('./includes/db.js');
var formBuilder = require('./formBuilder');

var Category = function() {

    this.handleGET = function(cli) {
        cli.touch('article.handleGET');
        if (cli.routeinfo.path.length == 2) {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
                case 'edit':
                    filelogic.serveAdminLML(cli);
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

    this.handlePOST = function(cli) {
        switch (cli.routeinfo.path[2]) {
            case 'new':
                this.new(cli);
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

    this.edit = function(cli) {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);
        if (response.success) {
            var formData = formBuilder.serializeForm(form);

            // Create post
            db.update(cli._c, 'categories', formData, function(err, result) {
                // Generate LML page
                cli.sendJSON({
                    redirect: cli._c.server.url + "/" + name,
                    form: {
                        success: true
                    }
                });

            });

        } else {
            cli.sendJSON({
                form: response
            });
        }
    };

    this.create = function(cli) {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);
        if (response.success) {
            var formData = formBuilder.serializeForm(form);

            // Create post
            db.insert(cli._c, 'categories', formData, function(err, result) {
                // Generate LML page
                cli.sendJSON({
                    redirect: cli._c.server.url + "/" + name,
                    form: {
                        success: true
                    }
                });

            });

        } else {
            cli.sendJSON({
                form: response
            });
        }
    };

    this.delete = function(cli) {
        if (cli.postdata.data.id) {
            db.remove(cli._c, 'categories', {_id : db.mongoID(cli.postdata.data.id)}, function() {
                cli.sendJSON({
                    redirect: cli._c.server.url + "/" + name,
                    form: {
                        success: true
                    }
                });
            });
        } else {
            cli.refresh();
        }
    }

    this.createLivevars = function() {
        livevars.registerLiveVariable('categories', function(cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                db.singleLevelFind(cli._c, 'categories', callback);
            } else if (levels[0] == "all") {
                var sentArr = new Array();
                db.findToArray(cli._c, 'categories', {}, function(err, arr) {
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
        }, ["categories"]);
    };
    this.createLivevars();
};

module.exports = new Category();
