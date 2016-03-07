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
            db.findToArray(config.default(), 'changerequests', {
                _id: db.mongoID(cli.routeinfo.path[4])
            }, function(err, arr) {

                if (err) cli.crash(new Error("[ChangeRequest] - Error fetching changerequests : " + err));
                if (arr && arr.length > 0) {

                    var changeRequest = arr[0];
                    var updatedContent = formBuilder.serializeForm(form);
                    // Update article
                    db.findAndModify(config.default(), 'content', {
                        _id: db.mongoID(changeRequest.articleId)
                    }, {
                        title: updatedContent.title,
                        content: updatedContent.original
                    }, function(err, doc) {
                        if (err) cli.crash(new Error("[ChangeRequest] - Error while modifying content : " + err));
                        // Update campaign status
                        db.update(config.default(), 'campaigns', {
                            _id: db.mongoID(changeRequest.campId)
                        }, {
                            campstatus: "clipending"
                        }, function(err, result) {
                            if (err)cli.crash(new Error("[ChangeRequest] - Error while updateing campaign status : " + err));

                            cli.sendJSON({
                                success: true
                            });
                        });
                    });

                } else {
                    cli.sendJSON({
                        success: false
                    });
                }
            });
        } else {
            cli.sendJSON({
                success: false
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
                db.join(config.default(), 'changerequests', [{
                    $lookup: {
                        from: "campaigns",
                        localField: "campId",
                        foreignField: "_id",
                        as: "campaign"
                    }
                }, {
                    $unwind: "$campaign"
                }, {
                    $lookup: {
                        from: "entities",
                        localField: "campaign.clientid",
                        foreignField: "_id",
                        as: "campaign.client"
                    }
                }, {
                    $lookup: {
                        from: "content",
                        localField: "articleId",
                        foreignField: "_id",
                        as: "article"
                    }
                }, {
                    $unwind: "$campaign.client"
                }, {
                    $unwind: "$article"
                }, {
                    $project: {
                        "campaign.campname": 1,
                        "campaign.campstatus": 1,
                        "campaign.client.displayname": 1,
                        "article.title": 1
                    }
                }], callback);
            } else {
                if (params.diffview) {
                    db.multiLevelFind(config.default(), 'changerequests', levels, {
                        _id: db.mongoID(levels[0])
                    }, {
                        limit: [1]
                    }, function(changeRequest) {
                        if (typeof changeRequest !== 'undefined' && changeRequest.length > 0) {
                            db.multiLevelFind(config.default(), 'content', levels, {
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
                    db.multiLevelFind(config.default(), 'changerequests', levels, {
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
            .add('Change', 'submit');

        formBuilder.createForm('changerequest_edit_diff')
            .add('requested_title', 'text', {
                displayname: 'Title'
            })
            .add('requested_content', 'ckeditor', {
                displayname: 'Content',
                data : {readonly : true}
            })


    };
};

module.exports = new ChangeRequest();
