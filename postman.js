var _c = require('./config.js');
var sendgrid = require('sendgrid')(_c.default.sendgrid.apikey);
var hooks = require('./hooks.js');
var log = require('./log.js');

var hooks = {};

var transporter = undefined;
var messagesQueue = new Array();

var Postman = function() {
  this.register = function(eventName, mail, cb) {
    var that = this;

    hooks[eventName].push(mail);
    // Register to the hook event
    hooks.bind(eventName, 999, function(params, eventName) {
      //Get email template
      hooks[eventName].forEach(function(mail) {
        that.sendEmail(mail, cb);
      });
    })
  };

  this.createEmail = function(params, isHtml, callback) {
    if (isHtml) {
      var email = new sendgrid.Email(params);
      email.setHtml(filelogic.createHtmlMail(lmlPath, params, function(html) {
        params.html = undefined;
        delete params.html;
        console.log(html);
        email.setHtml = html;
        callback(email);
      }));


    } else {
      var email = new sendgrid.Email(params);
      callback(email);
    }
  };

  this.sendEmail(email, cb) {
    sendgrid.send(email, function(err, json) {
      if (err) log(err);
      cb(json);
    });
  };

};


module.exports = new Postman();
