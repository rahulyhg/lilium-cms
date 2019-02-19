var conf = require('./lib/config');

var stripe;
var transaction = function () {

    this.init = function () {
        if (conf.default().stripe && conf.default().stripe.secretkey) {
            stripe = require('stripe')(conf.default().stripe.secretkey);
        } else {
            log('Transaction', 'Stripe Api access is not configured!');
        }
    };

    this.deleteCustomer = function (id, cb) {
        stripe.customers.del(id, cb);
    };

    this.getCustomer = function (stripeId, cb) {
        stripe.customers.retrieve(stripeId, cb);
    }

    this.updateCustomer = function (stripeId, entity, cb) {
        stripe.customers.update(stripeId, {
                card: entity.stripeToken,
                email: entity.email,
                description: 'Created with lilium'
            },
            function (err, customer) {
                if (err) log('Transaction', err);
                return cb(customer.id);
            }
        );
    };

    this.charge = function (charge, cb) {
        stripe.charges.create(charge, cb);
    };

    this.processCharge = function (charge, cb) {
        stripe.charges.capture(charge.id, cb)
    };


    this.createNewCustomer = function (entity, cb) {
        stripe.customers.create({
                card: entity.stripeToken,
                email: entity.email,
                description: 'Created with lilium'
            },
            function (err, customer) {
                if (err) log('Transaction', err);
                return cb(customer.id);
            }
        );
    };
};
module.exports = new transaction();
