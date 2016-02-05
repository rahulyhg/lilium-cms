var conf = require('./config.js');
var stripe = require('stripe')(conf.default.stripe.secretkey);
var transaction = function() {
  console.log('in here');

  this.ini = function() {

  };

  this.createTransaction = function() {

  };

  this.balance = function() {

  };

  this.listAccounts = function() {

  };

  this.listCharges = function() {

  };

  this.deleteCustomer = function(id, cb) {
    stripe.customers.del(id, cb);
  }

  this.createNewCustomer = function(entity, cb) {
    stripe.customers.create({
        card: entity.stripeToken,
        email: entity.email,
        description: 'Created with lilium'
      },
      function(err, customer) {
        if (err) console.log(err);
        return cb(customer.id);
      }
    );
  };
};
module.exports = new transaction();
