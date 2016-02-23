var fileLogic = undefined;
var config = undefined;
var livevars = undefined;
var db = undefined;
var formBuilder = undefined;

var ChangeRequest = function() {
    this.handleGET = function(cli) {
        switch (cli.routeinfo.path[3]) {
            case 'edit':
                this.edit(cli);
                break;
            case undefined:
                fileLogic.serveLmlPluginPage('production', cli);
                break;
            default:
                cli.throwHTTP(404, 'Page not found');

        }
    };

    this.handlePOST = function(cli) {
        switch (cli.routeinfo.path[3]) {
            case 'edit':
                this.updateChange(cli);
                break;
            default:
                cli.throwHTTP(404, 'Page not found');

        }
    };

    this.updateChange = function(cli) {
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);
        if (response.success) {
            // Retrieve changerequest
            db.findToArray('changerequests', {
                _id: db.mongoID(cli.routeinfo.path[4])
            }, function(err, arr) {
                if (err) throw new Error("[ChangeRequest] - Error fetching changerequests : " + err);
                if (arr && arr.length > 0) {
                    var changeRequest = arr[0];
                    formBuilder.serializeForm(form)

                    // Update article
                    db.findAndModify('content', {
                        _id: db.mongoID(changeRequest.articleId)
                    }, {
                        title: changeRequest.title,
                        content: changeRequest.original
                    }, function(err, doc) {
                        if (err) throw new Error("[ChangeRequest] - Error while modifying content : " + err);
                        // Update campaign status
                        db.update('campaigns', {
                            _id: db.mongoID(changeRequest.campId)
                        }, {
                            campstatus: "clipending"
                        }, function(err, result) {
                            cli.crash(new Error("[ChangeRequest] - Error while updateing campaign status : " + err));
                            return;
                            cli.sendJSON({
                                success: true
                            });
                        });
                    });

                }
            });
        }


    };

    this.edit = function(cli) {
        fileLogic.serveLmlPluginPage('production', cli, true);
    };

    this.genLivevars = function() {

        livevars.registerLiveVariable('changerequests', function(cli, levels, params, callback) {
            var allRoles = levels.length === 0;

            if (allRoles) {
                db.join('changerequests', [{
                    $lookup: {
                        from: "campaigns",
                        localField: "articleId",
                        foreignField: "products._id",
                        as: "product"
                    }
                }, {
                    $project: {
                        "content": 1,
                        "title": 1,
                        "articleId": 1,
                        "product.products": {
                            $cond: {
                                if: {
                                    $eq: ["product.products.article", '56c742c06094640103ba3843']
                                },
                                then: 1,
                                else: 0
                            }
                        }

                    }

                }], callback);
            } else {
                if (params.diffview) {
                    db.multiLevelFind('changerequests', levels, {
                        _id: db.mongoID(levels[0])
                    }, {
                        limit: [1]
                    }, function(changeRequest) {
                        if (typeof changeRequest !== 'undefined' && changeRequest.length > 0) {
                            db.multiLevelFind('content', levels, {
                                _id: changeRequest[0].articleId
                            }, {
                                limit: [1]
                            }, function(content) {
                                changeRequest[0].original = content;
                                return callback(changeRequest);
                            });
                        } else {
                            return callback([]);
                        }

                    });
                } else {
                    db.multiLevelFind('changerequests', levels, {
                        _id: db.mongoID(levels[0])
                    }, {
                        limit: [1]
                    }, callback);
                }
            }
        });

    }

    this.init = function(abspath) {
        log = require(abspath + 'log.js');
        log("AdvertiserPlugin", "Initializing changeRequest class");
        fileLogic = require(abspath + 'filelogic.js');
        config = require(abspath + 'config.js');
        livevars = require(abspath + 'livevars.js');
        db = require(abspath + 'includes/db.js');

        formBuilder = require(abspath + 'formBuilder.js');

        this.genLivevars();

        formBuilder.createForm('changerequest_edit')
            .add('title', 'text', {
                displayname: 'Title'
            })
            .add('original', 'ckeditor', {
                displayname: 'Original Content'
            })
            .add('Change', 'submit')

    };
};

module.exports = new ChangeRequest();
