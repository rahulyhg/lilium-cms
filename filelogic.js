var FileServer = require('./fileserver.js');
var LML = require('./lml.js');
var _c = require('./config.js');
var fs = require('fs');
var slugify = require('slugify');

var FileLogic = function() {
  /*
  	File Logic
  	 * Serve file if it exists
  	 * Check if special page, generate if not present
  	 * Check for redirection
  	 * Throw soft 404 (hard if specified in config)
  */
  var serveCachedFile = function(cli, fullpath) {
    cli.touch('filelogic.serveCachedFile');
    FileServer.serveAbsFile(cli, fullpath);
  };

  var serveSpecialPage = function(cli, fullpath) {
    cli.touch('filelogic.serveSpecialPage');
    var specialName =
      cli.routeinfo.login ? "login" :
      cli.routeinfo.admin ? "admin" :
      "";

    var readPath = _c.default.server.base + "backend/dynamic/" + specialName + ".lml";
    var savePath = _c.default.server.html + '/' + _c.default.paths[specialName] + '/index.html';

    saveLmlPage(cli, readPath, savePath);
  };

  var serveStaticFile = function(cli, fullpath) {
    cli.touch('filelogix.serveStaticFile');
    cli.debug();
  };

  var redirectUserTo = function(cli) {
    cli.touch('filelogic.redirectUserTo');
    cli.debug();
  };

  var checkForSpecialPage = function(cli) {
    cli.touch('filelogic.checkForSpecialPage');
    return cli.routeinfo.admin || cli.routeinfo.login;
  };

  var checkForRedirection = function(cli) {
    cli.touch('filelogic.checkForRedirection');
    cli.redirectTo = undefined;
    return false;
  };

  this.serveLmlPage = function(cli) {
    var name = cli.routeinfo.fullpath;
    var readPath = _c.default.server.base + "backend/dynamic/" + name + ".lml";
    var savePath = _c.default.server.html + name +'/index.html';
		FileServer.fileExists(savePath, function(isPresent) {
			if (!isPresent) {
				saveLmlPage(cli, readPath, savePath);
			} else {
				serveCachedFile(cli, savePath);
			}

		});

  };

  this.renderLmlPostPage = function(cli, postType, extra, cb) {
    // Check for the post type
    var title = slugify(extra.title);
    var readPath = _c.default.server.base + "flowers/" + _c.default.website.flower + "/" + postType + ".lml";
    var savePath = _c.default.server.html + "/" + title + ".html";
    LML.executeToFile(
      readPath,
      savePath,
      function() {
        cli.responseinfo.filecreated = true;
        cb(_c.default.server.url + "/" + title + ".html");
      },
      extra
    );
  }

  var saveLmlPage = function(cli, readPath, savePath, extra) {
    LML.executeToFile(
      readPath,
      savePath,
      function() {
        cli.touch('filelogic.serveSpecialPage.callback');
        cli.responseinfo.filecreated = true;
        serveCachedFile(cli, savePath);
      },
      extra
    );

  }


  this.runLogic = function(cli) {
    cli.touch('filelogic.runlogic');
    var fullpath = _c.default.server.html + cli.routeinfo.fullpath;

    // Check for static file
    FileServer.fileExists(fullpath, function(isPresent) {
      if (isPresent) {
        serveCachedFile(cli, fullpath);
      } else if (cli.routeinfo.isStatic) {
        // Static file not found; hard 404
        cli.debug();
      } else if (checkForSpecialPage(cli)) {
        serveSpecialPage(cli, fullpath);
      } else if (checkForRedirection(cli)) {
        redirectUserTo(cli);
      } else {
        cli.debug();
        throw 404;
      }
    });
  };

  var init = function() {

  };

  init();
};

module.exports = new FileLogic();
