var formBuilder = undefined;
var fileLogic = undefined;
var entites = undefined;
var transaction = undefined;

var AdminAdvertiser = function() {
  this.handlePOST = function(cli) {
    cli.touch('advertiser.admin.handlePOST');
    switch (cli.routeinfo.path[2]) {
      case undefined:
        createFromCli(cli);
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
    createForm();

    fileLogic.serveLmlPluginPage('advertiser', cli, false);
  };

  this.newAdvertiser = function(cli) {

  };

  var createFromCli = function(cli) {
    cli.touch('entities.createFromCli');
    var entData = cli.postdata.data;
    var newEnt = entites.initialiseBaseEntity(entData);

    entites.registerEntity(newEnt, function() {
      cli.touch('advertiser.registerEntity.callback');
      // Create a new stripe user
      cli.redirect(_c.default.server.url + cli.routeinfo.fullpath);
    });
  }

  var createForm = function() {
    if (!formBuilder.isAlreadyCreated('advertiser_create')) {
      formBuilder.registerFormTemplate('avertiser')
        .add('creaditCard', 'text', {displayname:"Credit Card"});
      formBuilder.createForm('advertiser_create')
        .addTemplate('entity_create')
        .addTemplate('avertiser');
    }
  };

  this.init = function(abspath) {
    formBuilder = require(abspath + 'formBuilder.js');
    fileLogic = require(abspath + 'filelogic.js');
    entites = require(abspath + 'entities.js');
    transaction = require(abspath + 'transaction.js');

    return this;
  }

}

module.exports = new AdminAdvertiser();
