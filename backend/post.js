var filelogic = require('../filelogic.js');
var formBuilder = require('../formBuilder.js');
var conf = require('../config.js');
var PostController = function() {

  this.view = function (cli) {
    filelogic.serveLmlPage(cli);

  }

  this.new = function (cli) {
    if (!formBuilder.isAlreadyCreated('post_create')) {
      formBuilder.createForm('post_create')
        .add('title', 'text', {}, {minLenght : 10, maxLenght : 23})
        .add('content', 'ckeditor')
        .add('active', 'checkbox')
        .add('onpage', 'number', {}, { min: 10, max:15 })
        .add('publish', 'submit')
    }
    if (cli.method == 'POST') {
      var form = formBuilder.handleRequest(cli);
      var response = formBuilder.validate(form, true);
      var redirect = '';
      if (response.success) {
        redirect = conf.default.server.url +'/post/view/1';
      }
      cli.sendJSON({redirect: redirect, form : response});
    } else {

      filelogic.serveLmlPage(cli);
    }
  }

  this.newPostCreate = function () {

  }

  this.init = function (cli) {
  }
}
module.exports = new PostController();
