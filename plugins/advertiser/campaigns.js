var formBuilder = undefined;
var fileLogic = undefined;
var entites = undefined;
var transaction = undefined;
var log = undefined;
var config = undefined;
var db = undefined;

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
                fileLogic.serveLmlPluginPage('advertiser', cli, true);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;

        };
    };

    this.newAdvertiser = function(cli) {

    };

    var uploadSignature = function(cli) {
        console.log('DEBUGING');

        cli.debug();
        var form = formBuilder.handleRequest(cli);
        var validation = formBuilder.validate(form, false, cli);

        if (validation.success) {

        }
    }

    var serveSignPage = function(cli) {

        if (cli.routeinfo.path[3]) {
            db.findToArray('campaigns', {_id: db.mongoID(cli.routeinfo.path[3])}, function(err, array) {
                if(err) log('Advertiser Plugin', err);
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid) {
                    fileLogic.serveLmlPluginPage('advertiser', cli, true);
                } else {
                    cli.throwHTTP(400, 'Bad Request');
                }
            });
        } else {
            cli.throwHTTP(404, 'Not found');
        }
    }

    var createAdvertiser = function(cli) {
        cli.touch('advertiser.createAdvertiser');
        var form = formBuilder.handleRequest(cli);
        var response = formBuilder.validate(form, true);

        if (response.success) {
            var entData = cli.postdata.data;
            var newEnt = entites.initialiseBaseEntity(entData);

            if (entData.stripeToken) {
                // Create a new stripe user
                newEnt.stripeToken = entData.stripeToken;

                // Create a stripe customer
                transaction.createNewCustomer(newEnt, function(stripeid) {
                    // We don't need the token anymore
                    newEnt.stripeToken = undefined;
                    delete newEnt.stripeToken;

                    newEnt.stripeid = stripeid;

                    entites.registerEntity(newEnt, function() {
                        cli.touch('advertiser.registerEntity.callback');
                        cli.redirect(config.default.server.url + cli.routeinfo.fullpath);
                    });
                });
            } else {
                entites.registerEntity(newEnt, function() {
                    cli.touch('advertiser.registerEntity.callback');
                    cli.redirect(config.default.server.url + cli.routeinfo.fullpath);
                });
            }
        } else {
            cli.sendJSON({
                form: response
            });
        }
    };

    var editAdvertiser = function(cli) {
        cli.touch('advertiser.editAdvertiser');

        if (cli.routeinfo.path[3]) {

            var id = db.mongoID(cli.routeinfo.path[3]);
            if (cli.method == 'POST') {

                var form = formBuilder.handleRequest(cli);
                var response = formBuilder.validate(form, true);

                if (response.success) {
                    var entData = cli.postdata.data;
                    var serializedForm = formBuilder.serializeForm(form);
                    serializedForm.stripeToken = entData.stripeToken;

                    if (entData.stripeToken) {
                        //Check if there is already a stripe client for this advertiser
                        db.findToArray('entities', {
                            _id: db.mongoID(id)
                        }, function(err, arr) {
                            if (typeof arr[0] !== 'undefined' && typeof arr[0].stripeid !== 'undefined') {
                                // Update stripe user
                                transaction.updateCustomer(arr[0].stripeid, serializedForm, function(stripeid) {
                                    serializedForm.stripeid = stripeid;
                                    updateAdvertiser(serializedForm, id);
                                });
                            } else {
                                // Create stripe user
                                transaction.createCustomer(newEnt, function(stripeid) {
                                    serializedForm.stripeid = stripeid;
                                    updateAdvertiser(serializedForm, id);
                                });
                            }
                        });

                    } else {
                        updateAdvertiser(serializedForm, id);
                    }

                } else {
                    cli.sendJSON({
                        form: response
                    });
                }

            } else {
                fileLogic.serveLmlPluginPage('advertiser', cli, true);
            }

        } else {
            cli.throwHTTP(404, 'Advertiser Not Found');
        }

    };

    var updateAdvertiser = function(form, id) {
        if (typeof form.stripeToken !== 'undefined') {
            //Remove unneeded data.
            form.stripeToken = undefined;
            delete form.stripeToken;
            form.creaditCard = undefined;
            delete form.creaditCard;
            form.cvc = undefined;
            delete form.cvc;
            form.month = undefined;
            delete form.month;
            form.year = undefined;
            delete form.year;
        }

        db.update('entities', {
            _id: id
        }, form, function(err, r) {
            fileLogic.serveLmlPluginPage('advertiser', cli, true);
        });

    }

    var deleteAdvertiser = function(cli) {
        cli.touch('advertiser.deleteAdvertiser');
        var id = cli.postdata.data.uid;
        db.findToArray('entities', {
            _id: db.mongoID(id)
        }, function(err, arr) {
            if (typeof arr[0].stripeid !== 'undefined') {
                transaction.deleteCustomer(arr[0].stripeid, function() {
                    db.remove('entities', {
                        _id: db.mongoID(id)
                    }, function(err, result) {
                        cli.sendJSON({});
                    });
                });
            } else {
                db.remove('entities', {
                    _id: db.mongoID(id)
                }, function(err, result) {
                    cli.sendJSON({});
                });
            }

        });
    };

    this.init = function(abspath) {
        log = require(abspath + 'log.js');
        log("AdvertiserPlugin", "Initializing campaigns class");
        formBuilder = require(abspath + 'formBuilder.js');
        fileLogic = require(abspath + 'filelogic.js');
        entites = require(abspath + 'entities.js');
        // transaction = require(abspath + 'transaction.js');
        config = require(abspath + 'config.js');
        db = require(abspath + 'includes/db.js');

        formBuilder.createForm('advertiser_sign')
            .add('signature', 'file', {'displayname' : 'Upload a picture of your signature'}, {required : true})
            .add('term', 'checkbox', {displayname : 'I aggree with the terms'}, {required: true})
            .add('submit', 'submit');
    };

}

module.exports = new CampaignAdvertiser();
