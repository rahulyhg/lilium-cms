var conf = require('./config.js');
var sendgrid = require('sendgrid')(conf.default.sendgrid.apikey);
var hooks = require('./');
var hooks = {};

var Mail = function() {
  this.bind = function() {

  };

  this.trigger = function() {

  };
}

module.exports = new Mail();
