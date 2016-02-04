var formBuilder = undefined;
var fileLogic = undefined;
var entites = undefined;
var transaction = undefined;
var log = undefined;
var config = undefined;
var db = undefined;

var AdminAdvertiser = function() {
  this.handlePOST = function(cli) {
    cli.touch('advertiser.admin.handlePOST');
    switch (cli.routeinfo.path[2]) {
      case undefined:
        createAdvertiser(cli);
        break;
      case 'edit':
        this.edit(cli);
        break;
      case 'delete':
        deleteAdvertiser(cli);
        break;
      default:
        return cli.throwHTTP(404, 'Not Found');
        break;

    }
  };


  this.handleGET = function(cli) {
    createForm();

    fileLogic.serveLmlPluginPage('advertiser', cli, false);
  };

  this.newAdvertiser = function(cli) {

  };

  var createAdvertiser = function(cli) {
    cli.touch('entities.createFromCli');
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


  }
  var deleteAdvertiser = function(cli) {
  		var id = cli.postdata.data.uid;
      db.findToArray('entities', {_id:db.mongoID(id)}, function(err, arr) {
        if (typeof arr[0].stripeid !== 'undefined') {
          transaction.deleteCustomer(arr[0].stripeid, function() {
            db.remove('entities', {_id:db.mongoID(id)}, function(err, result) {
              return cli.redirect(_c.default.server.url + cli.routeinfo.fullpath);
            });
          });
        }

      });
  }
  var createForm = function() {
    if (!formBuilder.isAlreadyCreated('advertiser_create')) {
      formBuilder.registerFormTemplate('avertiser')
        .add('creaditCard', 'text', {displayname:"Card Number", data:{stripe:"number"}})
        .add('cvc', 'text', {displayname:"CVC", data:{stripe:"cvc"}})
        .add('month', 'text', {displayname:"Expiration month (MM)", data:{stripe:"exp-month"}})
        .add('year', 'text', {displayname:"Expiration year (YYYY)", data:{stripe:"exp-year"}});
      formBuilder.createForm('advertiser_create', {id:'stripe_form'})
        .addTemplate('entity_create')
        .addTemplate('avertiser');
    }
  };

  this.init = function(abspath) {
    log = require(abspath + 'log.js');
    log("AdvertiserPlugin", "Initializing admin class");
    formBuilder = require(abspath + 'formBuilder.js');
    fileLogic = require(abspath + 'filelogic.js');
    entites = require(abspath + 'entities.js');
    transaction = require(abspath + 'transaction.js');
    config = require(abspath + 'config.js');
    db = require(abspath + 'includes/db.js');

  }

}

module.exports = new AdminAdvertiser();
