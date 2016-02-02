var conf = require('./config.js');
var stripe = require('stripe')(conf.default.stripe.apikey);

var transaction = function() {
  this.createTransaction = function() {

  }

  this.balance = function() {

  }

  this.listAccounts = function() {

  }

  this.listCharges = function() {

  }

  this.createNewClient = function(user) {
    stripe.customers.create(
      { email: user.email },
  function(err, customer) {
    if (err) console.log(err);

    console.log(customer); // the created customer object
  }
);
  }
}
