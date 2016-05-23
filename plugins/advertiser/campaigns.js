var log = undefined;
var _c = undefined;
var Products = undefined;
var LiveVars = undefined;
var db = undefined;
var filelogic = undefined;
var formbuilder = undefined;
var hooks = undefined;
var tableBuilder = undefined;
var dfp = undefined;

var cachedCampaigns = new Object();
var registeredStatuses = new Array();
var noOp = function() {};

var Campaigns = function () {
    var that = this;

    var asyncForEach = function(arr, it, end) {
        if (typeof arr !== 'object') {
            end(new Error("[asyncForEach] First parameter must be an array (object type)"));
        }

        var len = arr.length;
        var index = 0;
        
        var loopFtc = function() {
            if (index >= len) {
                end();
            } else {
                it(arr[index], function() {
                    index++;
                    loopFtc();
                });
            }
        };

        loopFtc();
    }

    this.getCampaignsFromDatabase = function (conds, cb) {
        db.findToArray(_c.default(), 'campaigns', conds, function (err, data) {
            cb(err || data);
        });
    }

    this.getCampaignByProjectID = function (id, cb) {
        db.findToArray(_c.default(), 'campaigns', {
            "projectid": id
        }, function (err, data) {
            if (!err && data.length > 0) {
                data[0].tablekey = id;
            }

            cb(err || data[0]);
        });
    };

    this.getAllMyCampaigns = function (conds, cb) {
        db.findToArray(_c.default(), 'campaigns', conds, function (err, data) {
            cb(err || data);
        });
    };

    this.loadCampaignsStatuses = function (cb) {
        db.findToArray(_c.default(), 'campaignStatuses', new Object(), function (err, data) {
            if (typeof data !== 'undefined') {
                for (var i = 0; i < data.length; i++) {
                    registeredStatuses.push(data[i]);
                }
            }
            cb();
        });
    }

    var statusByName = function (statusname) {
        var status = undefined;
        for (var i = 0; i < registeredStatuses.length && !status; i++) {
            if (registeredStatuses[i].name == statusname) {
                status = registeredStatuses[i];
            }
        };

        return status;
    };

    var formatEntriesForList = function (entries, callback) {
        var arr = new Array();
        var max = entries.length;
        var index = 0;

        var nextEntry = function () {
            if (index == max) {
                return callback(arr);
            }

            var entry = entries[index];
            var listObj = {
                projectid: entry.projectid,
                name: entry.campname,
                status: statusByName(entry.campstatus).displayName,
                clientid: entry.clientid,
                url: _c.default().server.url + "/admin/campaigns/edit/" + entry.projectid
            }

            db.findToArray(_c.default(), 'entities', {
                _id: db.mongoID(listObj.clientid)
            }, function (err, res) {
                if (typeof res[0] === 'undefined') {
                    listObj.clientname = "[CLIENT NOT FOUND]";
                } else {
                    listObj.clientname = err || res[0].displayname;
                }

                arr.push(listObj);


                index++;
                nextEntry();
            });
        };

        nextEntry();
    };

    this.registerLiveVar = function () {
        var that = this;

        // levels : field to query
        // params : {
        //	query : value to query
        //	operator : operator to query with, '=' is none specified
        // };
        LiveVars.registerLiveVariable('campaigns', function (cli, levels, params, callback) {
            var firstLevel = levels[0];

            switch (firstLevel) {
                case "all":
                    if (cli.isGranted['campaigns']) {
                        that.getCampaignsFromDatabase(new Object(), callback);
                    } else {
                        callback();
                    }
                    break;
                case "list":
                    that.getCampaignsFromDatabase(new Object(), function (arr) {
                        formatEntriesForList(arr, callback);
                    });
                    break;
                case "mine":
                    if (cli.isGranted('advertiser')) {
                        that.getAllMyCampaigns({
                            clientid: db.mongoID(cli.userinfo.userid.toString())
                        }, callback);
                    } else {
                        callback();
                    }
                    break;
                case "ongoing":
                    if (cli.isGranted('advertiser')) {
                        that.getAllMyCampaigns({
                            campstatus : "ongoing",
                            clientid: db.mongoID(cli.userinfo.userid.toString())
                        }, function(arr) {
                            if (params.deep) {
                                asyncForEach(arr, function(obj, next) {
                                    obj.deep = true;

                                    asyncForEach(obj.products, function(prod, nextProduct) {
                                        var prodType = Products.getTypeOfProduct(prod.prodid).name;
                                        prod.deep = false;
                                        prod.productType = prodType;

                                        switch (prodType) {
                                            case "netdisc":
                                            case "sponsedit":
                                                db.findToArray(cli._c, 'content', {
                                                    name : prod.articlename
                                                }, function(err, arr) {
                                                    if (!err && arr[0]) {
                                                        prod.article = arr[0];
                                                        prod.deep = true;

                                                        var mediaid = prod.article.media;

                                                        if (mediaid) {
                                                            db.findToArray(cli._c, 'uploads', {
                                                                "_id" : db.mongoID(mediaid)
                                                            }, function(err, arr) {
                                                                prod.article.media = err || arr[0] || mediaid;
                                                                prod.article.media.deep = !err;

                                                                nextProduct();
                                                            });
                                                        } else {
                                                            nextProduct();
                                                        }
                                                    } else {
                                                        nextProduct();
                                                    }
                                                });
                                                break;
                                            case "display":
                                                db.findToArray(cli._c, 'dfpcache', {
                                                    id : prod.dfpprojid.toString()
                                                }, function(err, arr) {
                                                    if (!(err && !arr[0])) {
                                                        prod.dfp = arr[0];
                                                        prod.deep = true;
                                                    }
                                                    
                                                    nextProduct();
                                                });
                                                break;
                                            default:
                                                nextProduct();
                                        }
                                    }, next);
                                }, function() {
                                    callback(arr);
                                });
                            } else {
                                callback(arr);
                            }
                        });
                    } else {
                        callback();
                    }
                    break;
                case "needsattention_advertiser":
                    if (cli.isGranted('advertiser')) {
                        db.findToArray(_c.default(), 'campaigns', {
                            campstatus: {
                                $in: ['clipending', 'clipayment', 'clisign']
                            }
                        }, function (err, res) {
                            callback(err || res);
                        });
                    } else {
                        callback();
                    }
                    break;
                case "needsattention_prod":
                    if (cli.isGranted('production')) {
                        db.findToArray(_c.default(), 'campaigns', {
                            campstatus: {
                                $in: ['prod', 'preprod']
                            }
                        }, function (err, res) {
                            callback(err || res)
                        });
                    } else {
                        callback();
                    }
                    break;
                case "get":
                    var projectid = levels[1];

                    if (projectid) {
                        that.getCampaignByProjectID(decodeURI(projectid), callback);
                    } else {
                        callback("[CampaignException] ProjectID must be specified as a third level");
                    }
                    break;
                case "query":
                    var queryInfo;
                    try {
                        queryInfo = JSON.parse(params.query) || new Object();
                    } catch (err) {
                        cli.crash(new Error(err));
                        return;
                    }
                    var qObj = new Object();

                    queryInfo._id ? qObj._id = queryInfo._id : false;
                    queryInfo.projectid ? qObj.projectid = queryInfo.projectid : false;
                    queryInfo.campname ? qObj.campname = queryInfo.campname : false;
                    queryInfo.clientid ? qObj.clientid = queryInfo.clientid : false;
                    queryInfo.paymentreq ? qObj.paymentreq = queryInfo.paymentreq : false;
                    queryInfo.campstatus ? qObj.campstatus = {
                        $in: queryInfo.campstatus
                    } : false;

                    db.findToArray(_c.default(), 'campaigns', qObj, function (err, arr) {
                        callback(err || arr);
                    });
                    break;
                case "articlereview": //returns articles of the campaign in need of advertiser review
                    if (cli.isGranted('advertiser')) {
                        db.findToArray(cli._c, 'campaigns', {
                            _id: db.mongoID(levels[1])
                        }, function (err, array) {
                            if (err) log('Campaigns livevars', err);
                            if (array.length > 0 && cli.userinfo.userid == array[0].clientid.toString() && array[0].campstatus == 'clipending') {
                                var campaign = array[0];

                                //Get article in need of a review
                                var campaign = array[0];
                                var articlesID = [];

                                for (var key in campaign.products) if (campaign.products[key].articlename) {
                                    articlesID.push(campaign.products[key].articlename);
                                }

                                db.findToArray(_c.default(), 'content', {
                                    name: {
                                        $in: articlesID
                                    }
                                }, function (err, arr) {
                                    callback(arr);
                                });

                            } else {
                                callback();
                            }
                        });
                    } else {
                        callback();
                    }
                    break;
                case "query":
                    if (cli.isGranted('advertiser')) {
                        var queryInfo = params.query || new Object();
                        var qObj = new Object();

                        qObj._id = queryInfo._id;
                        qObj.campstatus = queryInfo.campstatus ? {
                            $or: queryInfo.campstatus
                        } : undefined;

                        that.getAllMyCampaigns(qObj, callback);
                    } else {
                        callback();
                    }
                    break;
                case "table":
                    var sort = {};
                    sort[typeof params.sortby !== 'undefined' ? params.sortby : '_id'] = (params.order || 1);
                    db.aggregate(cli._c, 'campaigns', [{
                        $match: (params.search ? {
                            $text: {
                                $search: params.search
                            }
                        } : {})

					}, {
                        $lookup: {
                            from: 'entities',
                            localField: 'clientid',
                            foreignField: '_id',
                            as: 'client'
                        }
					}, {
                        $unwind: {
                            path: "$client",
                            preserveNullAndEmptyArrays: true
                        }
					}, {
                        $lookup: {
                            from: 'campaignStatuses',
                            localField: 'campstatus',
                            foreignField: 'name',
                            as: 'campstatus'
                        }
					}, {
                        $project: {
                            client: "$client.displayname",
                            projectid: 1,
                            campname: 1,
                            name: 1,
                            campstatus: "$campstatus.displayName",
                            paymentreq: 1
                        }
					}, {
                        $sort: sort
					}, {
                        $skip: (params.skip || 0)
					}, {
                        $limit: (params.max || 20)
					}], function (data) {
                        db.find(cli._c, 'campaigns', (params.search ? {
                            $text: {
                                $search: params.search
                            }
                        } : {}), [], function (err, cursor) {

                            cursor.count(function (err, size) {
                                results = {
                                    size: size,
                                    data: data
                                }
                                callback(err || results);

                            });
                        });
                    });

                    break;
                default:
                    if (cli.isGranted('advertiser')) {
                        that.getAllMyCampaigns({
                            _id: db.mongoID(firstLevel)
                        }, callback);
                    } else {
                        callback();
                    }

            };
        });
    };

    this.handleGET = function (cli) {
        cli.touch('campaigns.handleGET');
        var params = cli.routeinfo.path;
        var hasParam = params.length > 2 && params[2] != "new";

        filelogic.serveAdminLML(cli, hasParam);
    };

    var cliToDatabaseCampaign = function (cli, old) {
        cli.touch('campaigns.clitodatabasecampaign');

        var postdata = cli.postdata.data;
        var products = new Array();

        for (var key in postdata.productstable) {
            var sprod = postdata.productstable[key];
            sprod.impressions = sprod.impressions ? parseInt(sprod.impressions) : 0;
            sprod._editid = key;
            products.push(sprod);
        }

        return {
            "projectid": postdata.projectid,
            "campname": postdata.campname,
            "campstatus": postdata.campstatus,
            "clientid": postdata.clientid,
            "products": products,
            "impression": postdata.impression || 0
        };
    };

    this.handlePOST = function (cli) {
        cli.touch('campaigns.handlePOST');
        var stack = formbuilder.validate(formbuilder.handleRequest(cli), true);
        var action = cli.routeinfo.path[2] || 'new';

        if (true || stack.valid) {
            dbCamp = cliToDatabaseCampaign(cli);
            dbCamp.clientid = db.mongoID(dbCamp.clientid);

            switch (action) {
                case 'new':
                    db.insert(cli._c, 'campaigns', dbCamp, function (res) {
                        dbCamp.cli = cli;
                        hooks.trigger('campaignCreated', {camp:dbCamp, cli : cli});
                        cli.redirect(cli._c.server.url + "/admin/campaigns/edit/" + dbCamp.projectid, false);
                    });
                    break;
                case 'edit':
                    db.findToArray(cli._c, 'campaigns', {
                        projectid: dbCamp.projectid
                    }, function (err, old) {
                        db.update(cli._c, 'campaigns', {
                            projectid: dbCamp.projectid
                        }, dbCamp, function (res) {
                            hooks.trigger('campaignUpdated', {
                                "old": err || old[0],
                                "new": dbCamp,
                                "cli": cli
                            });

                            if (!err && old[0] && old[0].campstatus != dbCamp.cmapstatus) {
                                hooks.trigger('campaignStatusChanged', {
                                    "old": old[0],
                                    "new": dbCamp,
                                    "cli": cli
                                });
                            }

                            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath, false);
                        }, false, true);
                    });
                    break;
                default:
                    cli.throwHTTP(404, 'NOT FOUND');
            }
        } else {
            cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?invalidform", false);
        }
    };

    this.registerCreationForm = function () {
        formbuilder.createForm('campaign_create', {
                fieldWrapper: {
                    'tag': 'div',
                    'cssPrefix': 'campaigncreatefield-'
                },
                cssClass: "form-campaign-creation",
                dependencies: ["sites.all.simple", "products.all", "sponsoredcontent", "dfpcache.all.simple"]
            })
            .beginSection('clientbox', {
                classes : ""
            })
            .add('clienttitle', 'title', {
                displayname: "Client"
            })          
            .add('clientid', 'livevar', {
                endpoint: "entities.query",
                tag: "select",
                template: "option",
                title: "client",
                nolabel : true,
                props: {
                    query: {
                        roles: ["advertiser"]
                    },
                    html: "displayname",
                    value: "_id"
                },
                wrapper : {
                    class : ["half-inline"]
                }       
            })
            .add('actionaddclient', 'button', {
                displayname: "New Client",
                classes : ["btn-default", "btn-add"],
                wrapper : {
                    class : "nopad field-wrapper-nopad half-inline"
                },
                nowrap : true
            })
            .closeSection('clientbox')
            .add('campprojtitle', 'title', {
                displayname : "Campaign information"
            })
            .add('projectid', 'text', {
                displayname: "Project ID",
                editonce: true
            })
            .add('campname', 'text', {
                displayname: "Campaign name"
            })
            .add('campstatus', 'select', {
                displayname: "Status",
                datasource: registeredStatuses
            })
            .add('producttitle', 'title', {
                displayname : "Products"
            })
            .add('productstable', 'livevar', {
                endpoint: "products.all",
                tag: "pushtable",
                nolabel : true,
                displayname: "Products",
                template: "tmpl_productrow",
                datascheme: {
                    hiddenFields : [
                        "impressions"
                    ],
                    key: {
                        displayName: "Product",
                        keyName: "displayName",
                        keyValue: "name",
                        readKey: "prodid"
                    },
                    columns: [
                    {
                        fieldName: "qte",
                        dataType: "number",
                        displayName: "Quantity",
                        defaultValue: 1,
                        influence: [{
                            fieldName: "price",
                            eq: "*"
						}, {
                            fieldName: "targetimp",
                            eq: "="
						}]
					}, {
                        fieldName: "pricebase",
                        displayName: "Based on",
                        keyName: "priceBase",
                        defaultValue: "unit"
					}, {
                        fieldName: "price",
                        dataType: "money",
                        displayName: "Price",
                        keyName: "price",
                        prepend: "$"
					}, {
                        fieldName: "enddate",
                        dataType: "date",
                        displayName: "End Date",
                        keyName: "enddate"
					}, {
                        fieldName: "targetimp",
                        dataType: "number",
                        displayName: "Target Impressions",
                        keyName: "targetimp"
					}, {
                        fieldName: "website",
                        displayName: "Website",
                        keyName: "website",
                        dataType: "multiple",
                        datasource: {
                            datasource: "sites.all.simple",
                            keyName: "displayName",
                            keyValue: "name"
                        }
					}, {
                        fieldName: "productapilink",
                        dataType: "template",
                        templateid: "productapilink"
					}],
                    columnTemplates: {
                        "productapilink": {
                            fields: [{
                                fieldName: "articlename",
                                displayName: "Article",
                                keyName: "articlename",
                                displayCase: ["sponsedit", "netdisc"],
                                autocomplete: {
                                    datasource: "sponsoredcontent",
                                    keyValue: "name",
                                    keyName: "title",
                                    cantAdd: true
                                }
							}, {
                                fieldName: "dfpprojid",
                                displayName: "DPF Project ID",
                                keyName: "dfpprodid",
                                displayCase: ["display"],
                                autocomplete: {
                                    datasource: "dfpcache.all.simple",
                                    keyValue: "id",
                                    keyName: "name",
                                    cantAdd: false
                                }
							}, {
                                fieldName: "fbcampid",
                                dataType: "text",
                                displayName: "Facebook camp. ID",
                                keyName: "fbcampid",
                                displayCase: ["facebook"]
							}, {
                                fieldName: "apilink",
                                dataType: "text",
                                displayName: "More details",
                                keyName: "details",
                                displayCase: ["*"]
							}],
                            dependsOn: "productType"
                        }
                    },
                    footer: {
                        title: "Total",
                        sumIndexes: [2]
                    }
                }
            })
            .add('save', 'submit', {
                onlyWhen: "new",
                displayName: 'Save'
            });
    };

    var getCampHistory = function(cli, campid, cb) {
        db.aggregate(cli._c, 'campaignHistory', [ 
            { $lookup: {
                from:"entities", 
                localField:"actionby", 
                foreignField:"_id", 
                as:"user" }
            }, {
                $unwind : "$user"
            }  
        ], function(err, arr) {
            if (err) {
                log('Campaigns', "Error while fetching history from DB : " + err);
                cb([]);
                return;
            }

            arr.forEach(function(obj, index) {
                obj.user = {
                    displayname : obj.user.displayname
                }
            });

            cb(arr);
        })
    };

    this.registerHooks = function () {
        hooks.bind('article_will_create', 200, function (pkg) {
            pkg.article.impressions = 0;
            pkg.article.targetimpressions = -1;
            pkg.article.targetdate = -1;
        });
 
        hooks.bind('campaignCreated', 315, function(pkg) {
            var camp = pkg.camp;
            var cli = pkg.cli;

            log('Campaigns', 'Inserting first history entry for new ampaign');
            db.insert(cli._c, 'campaignHistory', {
                campaignid : camp._id,
                mutations : {
                    "campstatus" : ["none", camp.campstatus]
                },
                actionby : cli.session.data._id,
                at : new Date()
            }, function(err, res) {
                log('Campaigns', err || 'Inserted new campaign in mutation history');
            });
        });

        hooks.bind('campaignUpdated', 320, function(pkg) {
            var older  = pkg.old;
            var latest = pkg.new;
            var cli = pkg.cli;

            log('Campaigns', 'Computing differences');
            var mutations = new Object();
            for (var key in latest) {
                if (
                    key[0] !== '_' && (
                        typeof older[key] === 'undefined' ||
                        older[key] === null || latest[key] === null ||
                        older[key].toString() !== latest[key].toString()
                    ) && (
                        older[key] !== null && latest[key] !== null
                    )
                ) {
                    mutations[key] = [
                        older[key],
                        latest[key]
                    ];
                }
            }

            log('Campaigns', 'Inserting history entry');
            db.insert(cli._c, "campaignHistory", {
                campaignid : older._id,
                mutations : mutations,
                actionby : cli.session.data._id,
                at : new Date()
            }, function(err, res) {
                log('Campaigns', err || "Inserted history entry");
            });
        });
    };
    var createTable = function () {

        tableBuilder.createTable({
            name: 'campaign',
            endpoint: 'campaigns.table',
            paginate: true,
            searchable: true,
            max_results: 25,
            fields: [{
                key: 'projectid',
                displayname: 'ID',
                sortable: true
			}, {
                key: 'campname',
                displayname: 'Name',
                sortable: true,
			}, {
                key: 'campstatus',
                displayname: 'Status',
                sortable: true
			}, {
                key: 'client',
                displayname: 'Client',
                sortable: true
			}, {
                key: '',
                displayname: 'Actions',
                template: 'table-campaign-actions',
                sortable: false
			}]
        });
    };

    this.init = function (abspath, cb) {
        log = require(abspath + 'log.js');
        _c = require(abspath + 'config.js');
        Products = require('./products.js');
        LiveVars = require(abspath + 'livevars.js');
        db = require(abspath + 'includes/db.js');
        filelogic = require(abspath + 'filelogic.js');
        formbuilder = require(abspath + 'formBuilder.js');
        hooks = require(abspath + 'hooks.js');
        tableBuilder = require(abspath + 'tableBuilder.js');
        dfp = require(abspath + "/plugins/advertiser/dfp.js");
        createTable();

        Products.init(abspath, _c, cb);
    };
};

module.exports = new Campaigns();
