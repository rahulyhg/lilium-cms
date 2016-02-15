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
                servePayPage(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;

        };
    };

    this.newAdvertiser = function(cli) {

    };

    var uploadSignature = function(cli) {

        if (cli.routeinfo.path[3]) {

            // Find campaing
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {
                if (err) log('Advertiser Plugin', err);
                //
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid && array[0].campstatus == 'clisign') {

                    var form = formBuilder.handleRequest(cli);
                    var validation = formBuilder.validate(form, false, cli);


                    if (validation) {

                        var image = formBuilder.serializeForm(form);
                        var extensions = image.signature.split('.');
                        var mime = extensions[extensions.length - 1];

                        var nextStatus = array[0].paymentreq ? 'clipayment' : 'prod';

                        if (config.default.supported_pictures.indexOf('.' + mime) != -1) {
                            // Save it in database
                            db.update('campaigns', {
                                _id: array[0]._id
                            }, {
                                clientsignature: image.signature,
                                campstatus: nextStatus
                            }, function(err, result) {
                                cli.sendJSON({
                                    form: {
                                        redirect: '',
                                        success: true
                                    }
                                });
                            });
                        } else {
                            cli.sendJSON({
                                form: response
                            });
                        }
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

    var servePayPage = function(cli) {

        if (cli.routeinfo.path[3]) {
            db.findToArray('campaigns', {
                _id: db.mongoID(cli.routeinfo.path[3])
            }, function(err, array) {
                if (err) log('Advertiser Plugin', err);
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid && array[0].campstatus == 'clipayment') {
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
                if (array.length > 0 && cli.userinfo.userid == array[0].clientid && array[0].campstatus == 'clisign') {
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
        // transaction = require(abspath + 'transaction.js');
        config = require(abspath + 'config.js');
        db = require(abspath + 'includes/db.js');

        formBuilder.createForm('advertiser_sign')
            .add('signature', 'file', {
                'displayname': 'Upload a picture of your signature'
            }, {
                required: true
            })
            .add('term', 'checkbox', {
                displayname: 'I agree with the terms'
            }, {
                required: true
            })
            .add('submit', 'submit');

        formBuilder.createForm('advertiser_pay')
            .addTemplate('payment');
    };

}

module.exports = new CampaignAdvertiser();
