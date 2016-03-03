var formBuilder = undefined;
var fileLogic = undefined;
var entites = undefined;
var transaction = undefined;
var log = undefined;
var _c = undefined;
var db = undefined;
var adminAdvertiser = require('./adminAdvertiser.js');
var fileserver = undefined;

var CampaignAdvertiser = function() {
    this.handlePOST = function(cli) {
        cli.touch('advertiser.campaigns.handlePOST');
        switch (cli.routeinfo.path[2]) {
            case undefined:
                return createAdvertiser(cli);
                break;
            case 'sign':
                return uploadSignature(cli);
                break;
            case 'delete':
                return deleteAdvertiser(cli);
                break;
            case 'pay':
                return payCampaign(cli);
                break;
            case 'review':
                return postChangeRequest(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;

        }
    };


    this.handleGET = function(cli) {

        cli.touch('advertiser.campaigns.handleGET');

        switch (cli.routeinfo.path[2]) {
            case undefined:
                fileLogic.serveLmlPluginPage('advertiser', cli, false);
                break;
            case 'sign':
                serveSignPage(cli);
                break;
            case 'pay':
                servePayPage(cli);
                break;
            case 'review':
                reviewArticle(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;

        };
    };

    this.newAdvertiser = function(cli) {

    };

    var postChangeRequest = function(cli) {
        if (cli.routeinfo.path[3]) {
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid.toString() && array[0].campstatus == 'clipending') {
                    var campaign = array[0];

                    var updatecamp = function(status) {
                        //Update camp status
                        db.update('campaigns', {_id: campaign._id}, {campstatus : status}, function() {
                            cli.sendJSON({
                                success: true,
                                redirect: _c.default.server.url + '/advertiser/campaigns'
                            });
                        })
                    }
                    console.log(cli.postdata);
                    // Check if there is some post data
                    if (typeof cli.postdata.data !== 'undefined' && typeof cli.postdata.data.changerequests !== 'undefined') {
                        var changerequests = cli.postdata.data.changerequests
                        var changeobj = [];
                        //Create changerequests
                        for (var key in changerequests) {
                            var request = {};
                            request.content = escape(changerequests[key].content);
                            request.campId = campaign._id;
                            request.title = escape(changerequests[key].title);
                            request.articleId = db.mongoID(key);
                            changeobj.push(request);
                        }

                        db.insert('changerequests', changeobj, function(err, r) {
                            // Update status
                            updatecamp('review');

                        });

                    } else {
                        // Update status
                        updatecamp('ready');
                    }



                } else {
                    cli.throwHTTP(400, 'Bad request');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }
    }

    var payCampaign = function(cli) {
        var that = this;

        //Retrieve campaign
        if (cli.routeinfo.path[3]) {

            // Find campaing
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {

                if (err) log('Advertiser Plugin', err);

                // Make sure the campaingn is at the payment status
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid.toString() && array[0].campstatus == 'clipayment') {
                    var campaign = array[0];

                    // Check if we have a stripe customer for the current Advertiser
                    findStripeCostumer(cli, function(result) {

                        if (typeof result == 'object' && result.length > 0 && result[0].isStripeClient) {

                            // Stripe payement
                            stripeOrder(result[0].stripeID, campaign, function(order) {

                                if (order.paid) {
                                    cli.redirect(_c.default.server.url + "/advertiser?alert=OrderSuccessfull!");
                                } else {

                                    cli.refresh();
                                }
                            });
                        } else {
                            // Create stripe client
                            var form = formBuilder.handleRequest(cli);
                            var response = formBuilder.validate(form, true);

                            if (response.success) {

                                var entData = cli.postdata.data;
                                var serializedForm = formBuilder.serializeForm(form);
                                serializedForm.stripeToken = entData.stripeToken;
                                adminAdvertiser.addAdvertiserStripeCostumer(entData.stripeToken, serializedForm, cli.userinfo.userid, function(success, advertiser) {
                                    if (success) {
                                        // Create order and pay it
                                        stripeOrder(advertiser.stripeid, campaign, function(order) {
                                            if (order.paid) {

                                                cli.redirect(_c.default.server.url + "/advertiser");
                                            } else {
                                                cli.refresh();
                                            }
                                        });
                                    } else {
                                        cli.throwHTTP(400, 'Advertiser failed to update');
                                    }


                                });

                            } else {
                                cli.refresh();
                            }
                        }
                    })
                } else {
                    cli.throwHTTP(400, 'Campaign not ready for payment');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }
    }

    var stripeOrder = function(stripeId, campaign, cb) {
        var charge = {
            currency: 'CAD',
            amount: 0,
            customer: stripeId
        }

        for (var key in campaign.products) {
            charge.amount += campaign.products[key].price * 100;
        }

        transaction.charge(charge, function(err, charge) {
            if (charge.paid) {
                // Update campaign status
                db.update('campaigns', {
                    _id: campaign._id
                }, {
                    campstatus: "prod"
                }, function(err) {
                    cb(charge);
                });
            } else {
                cb(charge);
            }

        });

    };

    var findStripeCostumer = this.findStripeCostumer = function(cli, callback) {
        db.findToArray('entities', {
            _id: cli.userinfo.userid
        }, function(err, arr) {
            if (typeof arr[0] !== 'undefined' && typeof arr[0].stripeid !== 'undefined' && arr[0].stripeid !== '') {
                // Get stripe client for last credit card numbers
                transaction.getCustomer(arr[0].stripeid, function(err, client) {
                    if (typeof client !== 'undefined' && client.sources.data[0]) {
                        // Client is created and credit card
                        callback(err || [{
                            isStripeClient: true,
                            stripeID: client.id,
                            creditcard: {
                                last4: client.sources.data[0].last4,
                                type: client.sources.data[0].brand
                            }
                        }]);
                    } else {
                        // Client is created but no credit card
                        callback(err || [{
                            isStripeClient: false
                        }]);
                    }

                });

            } else {
                callback(err || [{
                    isStripeClient: false
                }]);

            }
        });
    };

    var uploadSignature = function(cli) {

        if (cli.routeinfo.path[3]) {

            // Find campaing
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, camp) {
                if (err) log('Advertiser Plugin', err);
                //
                if (camp.length > 0 && cli.userinfo.userid == camp[0].clientid.toString() && camp[0].campstatus == 'clisign') {
                    var campaign = camp[0];
                    var form = formBuilder.handleRequest(cli);
                    var validation = formBuilder.validate(form, false, cli);


                    if (validation) {

                        var image = formBuilder.serializeForm(form);
                        var signature = image.signature;

                        var filename = fileserver.genRandomNameFile(signature);
                        var path =  _c.default.server.base + "backend/static/uploads/" +filename + ".png";

                        // Create signature image from text
                        fileserver.genImageFromText(signature, path, "Arty Signature", 30, function() {
                            //Save

                            var nextStatus = campaign.paymentreq ? 'clipayment' : 'prod';

                                // Save it in database
                                db.update('campaigns', {
                                    _id: campaign._id
                                }, {
                                    clientsignature: filename + ".png",
                                    campstatus: nextStatus
                                }, function(err, result) {
                                    if (campaign.paymentreq) {
                                        cli.redirect(_c.default.server.url + "/advertiser/campaigns/pay/" + campaign._id);
                                    } else {
                                        cli.redirect(_c.default.server.url + "/advertiser?alert=Signature Successfull!");
                                    }
                                });
                        });

                    } else {
                        cli.refresh();
                    }

                } else {
                    cli.throwHTTP(400, 'Bad Request');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }
    };

    var reviewArticle = function(cli) {
        fileLogic.serveLmlPluginPage('advertiser', cli, true);
    };

    var changeRequest = function(cli) {
        if (cli.routeinfo.path[3]) {

            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {
                if (err) log('Advertiser Plugin', err);
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid && array[0].campstatus == 'clipending') {} else {
                    cli.throwHTTP(400, 'Bad Request');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }
    };

    var servePayPage = function(cli) {

        if (cli.routeinfo.path[3]) {
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {
                if (err) log('Advertiser Plugin', err);
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid.toString() && array[0].campstatus == 'clipayment') {
                    fileLogic.serveLmlPluginPage('advertiser', cli, true);
                } else {
                    cli.throwHTTP(400, 'Bad Request');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }

    };

    var serveSignPage = function(cli) {

        if (cli.routeinfo.path[3]) {
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {
                if (err) log('Advertiser Plugin', err);
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid.toString() && array[0].campstatus == 'clisign') {
                    fileLogic.serveLmlPluginPage('advertiser', cli, true);
                } else {
                    cli.throwHTTP(400, 'Bad Request');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }
    };

    this.init = function(abspath) {
        log = require(abspath + 'log.js');
        log("AdvertiserPlugin", "Initializing campaigns class");
        formBuilder = require(abspath + 'formBuilder.js');
        fileLogic = require(abspath + 'filelogic.js');
        entites = require(abspath + 'entities.js');
        transaction = require(abspath + 'transaction.js');
        _c = require(abspath + 'config.js');
        db = require(abspath + 'includes/db.js');
        fileserver = require(abspath + 'fileserver.js');

        formBuilder.createForm('advertiser_sign')
            .add('signature', 'text', {
                'displayname': 'Sign by typing your complete name'
            }, {
                required: true
            })
            .add('term', 'checkbox', {
                displayname: 'I agree with the terms'
            }, {
                required: true
            })
            .add('submit', 'submit');

        formBuilder.createForm('advertiser_pay', {
                id: "stripe_form"
            })
            .addTemplate('payment')
            .add('Pay', 'submit');

        formBuilder.createForm('advertiser_article_review')
            .addTemplate('article_base')
            .add('_id', 'hidden')
    };

}

module.exports = new CampaignAdvertiser();
