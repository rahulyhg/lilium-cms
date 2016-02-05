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
          edit(cli);
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

      cli.touch('advertiser.admin.handleGET');

      switch (cli.routeinfo.path[2]) {
        case undefined:
          fileLogic.serveLmlPluginPage('advertiser', cli, false);
          break;
        case 'edit':
          fileLogic.serveLmlPluginPage('advertiser', cli, true);
          break;
        default:
          return cli.throwHTTP(404, 'Not Found');
          break;

      };
    };

      this.newAdvertiser = function(cli) {

      };

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

          var id = new mongo.ObjectID(cli.routeinfo.path[3]);
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
                      updateAdvertiser(serializedForm);
                    });
                  } else {
                    // Create stripe user
                    transaction.createCustomer(newEnt, function(stripeid) {
                      serializedForm.stripeid = stripeid;
                      updateAdvertiser(serializedForm);
                    });
                  }
                });

              } else {
                updateAdvertiser();
              }

            } else {
              cli.sendJSON({
                form: response
              });
            }

          } else {
            filelogic.serveLmlPage(cli, true);
          }

        } else {
          cli.throwHTTP(404, 'Advertiser Not Found');
        }

      };

      var updateAdvertiser = function(form) {
        serializedForm.stripeToken = undefined;
        delete serializedForm.stripeToken;

        db.update('entities', {
          _id: id
        }, form, function(err, r) {
          cli.sendJSON({
            success: true
          });
        });

      }

      var deleteAdvertiser = function(cli) {
        cli.touch('advertiser.deleteAdvertiser');
        var id = cli.postdata.data.uid;
        db.findToArray('entities', {
          _id: db.mongoID(id)
        }, function(err, arr) {
          console.log(arr[0]);
          if (typeof arr[0].stripeid !== 'undefined') {
            transaction.deleteCustomer(arr[0].stripeid, function() {
              db.remove('entities', {
                _id: db.mongoID(id)
              }, function(err, result) {
                return cli.redirect(_c.default.server.url + cli.routeinfo.fullpath);
              });
            });
          }

        });
      };

      var createForm = function() {
        if (!formBuilder.isAlreadyCreated('advertiser_create')) {
          formBuilder.registerFormTemplate('avertiser')
            .add('creaditCard', 'text', {
              displayname: "Card Number",
              data: {
                stripe: "number"
              }
            })
            .add('cvc', 'text', {
              displayname: "CVC",
              data: {
                stripe: "cvc"
              }
            })
            .add('month', 'text', {
              displayname: "Expiration month (MM)",
              data: {
                stripe: "exp-month"
              }
            })
            .add('year', 'text', {
              displayname: "Expiration year (YYYY)",
              data: {
                stripe: "exp-year"
              }
            });
          formBuilder.createForm('advertiser_create', {
              id: 'stripe_form'
            })
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

      };

    }

    module.exports = new AdminAdvertiser();
