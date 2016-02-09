var fileLogic = undefined;
var config = undefined;
var livevars = undefined;
var db = undefined;
var formbuilder= undefined;

var ChangeRequest = function() {
  this.handleGET = function(cli) {
    switch (cli.routeinfo.path[3]) {
      case 'edit':
        this.edit(cli);
        break;
      case 'changerequest':
        changeRequest.handleGET(cli);
        break;
      default:
        cli.throwHTTP(404, 'Page not found');

    }
  };

  this.handlePOST = function(cli) {
    switch (cli.routeinfo.path[3]) {
      case 'edit':
        this.edit(cli);
        break;
      case 'changerequest':
        changeRequest.handleGET(cli);
        break;
      default:
        cli.throwHTTP(404, 'Page not found');

    }
  };

  this.edit = function(cli) {
    fileLogic.serveLmlPluginPage('production', cli, true);
  }

  this.genLivevars = function() {

        livevars.registerLiveVariable('changerequests', function(cli, levels, params, callback) {
          var allRoles = levels.length === 0;

          if (allRoles) {
            db.singleLevelFind('changerequests', callback);
          } else {
            if (params.diffview) {
      				db.multiLevelFind('changerequests', levels, {_id : db.mongoID(levels[0])}, {limit:[1]}, function(changeRequest) {
                if (typeof changeRequest !== 'undefined' && changeRequest.length > 0) {
                  db.multiLevelFind('content', levels, {_id: changeRequest[0].articleId}, {limit:[1]}, function(content) {
        						changeRequest[0].original = content;
        						return callback(changeRequest);
        					});
                } else {
                  return callback([]);
                }

      				});
      			} else {
              db.multiLevelFind('changerequests', levels, {_id : db.mongoID(levels[0])}, {limit:[1]}, callback);
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

    formbuilder = require(abspath + 'formBuilder.js');

    this.genLivevars();

    formbuilder.createForm('changerequest_edit')
    .add('original[0].content', 'ckeditor', {})
    .add('diff', 'ckeditor', {readOnly : true})
    .add('Change', 'submit')

  };
};

module.exports = new ChangeRequest();
