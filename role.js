var filelogic = require('./filelogic.js');
var formBuilder = require('./formBuilder.js');
var conf = require('./config.js');
var db = require('./includes/db.js');
var mongo = require('mongodb');
var livevars = require('./livevars.js');
var fs = require('./fileserver.js');

var Role = function() {
    this.handlePOST = function(cli) {
        cli.touch('role.handlePOST');
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

    this.handleGET = function(cli) {
        cli.touch('role.handleGET');
        if (cli.routeinfo.path.length == 2) {
            cli.redirect(conf.default.server.url + cli.routeinfo.fullpath + "/list", true);
        } else {
            switch (cli.routeinfo.path[2]) {
                case 'new':
                    this.new(cli);
                    break;
                case 'edit':
                    this.edit(cli);
                    break;
                case 'getArticle':
                    this.getArticle(cli);
                    break;
                case 'list':
                    this.list(cli);
                    break;
                default:
                    return cli.throwHTTP(404, 'Not Found');
                    break;

            }
        }
    };

    this.list = function(cli) {
        filelogic.serveLmlPage(cli, false);
    }

    this.new = function(cli) {
        cli.touch('role.new');

        if (cli.method == 'POST' && cli.postdata) {
            var redirect = '';

            // Create post
            db.insert('roles', prepareRoleForDB(cli), function(err, result) {
                console.log(result);
                // Generate LML page
                cli.redirect('/admin/roles/edit/');
            });

        } else {
            filelogic.serveLmlPage(cli);
        }

    };

    this.edit = function(cli) {
        if (cli.routeinfo.path[3]) {

            var id = new mongo.ObjectID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {

                    db.update('content', {
                        _id: id
                    }, formBuilder.serializeForm(form), function(err, r) {
                        cli.sendJSON({
                            success: true
                        });
                    });

                } else {
                    cli.sendJSON({
                        form: response
                    });
                }

            } else {
                filelogic.serveLmlPage(cli, true);
            }


        } else {
            cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.delete = function(cli) {
        if (cli.routeinfo.path[3] && cli.routeinfo.path[3].length >= 24) {
            var id = new mongo.ObjectID(cli.routeinfo.path[3]);

            db.remove('content', {
                _id: id
            }, function(err, r) {
                var filename = r.title + '.html';
                fs.deleteFile(filename, function() {
                    cacheInvalidator.removeFileToWatch(filename);
                    return cli.sendJSON({
                        redirect: '/admin/article/list',
                        success: true
                    });
                });

            });

        } else {
            return cli.throwHTTP(404, 'Article Not Found');
        }
    }

    this.prepareRoleForDB = function(cli) {
        var postdata = cli.postdata.data;
        var rights = new Array();

        for (var key in postdata.rights) {
            rights.push(postdata.rights[key]);
        }

        return {
            "name": postdata.name,
            "displayname": postdata.displayname,
            "rights": rights
        };
    }



    this.registerContentLiveVar = function() {
        livevars.registerLiveVariable('roles', function(cli, levels, params, callback) {
            var allContent = levels.length === 0;
            if (allContent) {
                db.singleLevelFind('role', callback);
            } else if (levels[0] == "all") {
                var sentArr = new Array();
                db.findToArray('content', {}, function(err, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        sentArr.push({
                            articleid: arr[i]._id,
                            title: arr[i].title
                        });
                    };

                    callback(sentArr);
                });
            } else {
                db.multiLevelFind('roles', levels, {
                    _id: new mongo.ObjectID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["roles"]);

    }

    var registerForms = function() {
        formBuilder.createForm('role_create', {
			fieldWrapper : {
				tag : 'div',
				cssPrefix : 'role-field-'
			},
			cssClass : 'role-form',
			dependencies : [],
			async : true
		})
		.add('name', 'text', {
			displayname : "Name",
		})
		.add('displayname', 'text', {
			displayname : "Display Name",
		})
		.add('rights', 'stack', {
			displayname : "User Rights",
			scheme : {
				columns : [
					{fieldName:'rightname', dataType:'text', displayname:"Name"},
				]
			}
		})
		.add('submit', 'submit', {
			displayname : "Create Role"
		});
    }


    var init = function() {registerForms()};

    init();
};

module.exports = new Role();
