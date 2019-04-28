const conf = require('./lib/config');

var stripe;
class Transaction {
    init() {
        if (conf.default().stripe && conf.default().stripe.secretkey) {
            stripe = require('stripe')(conf.default().stripe.secretkey);
        } else {
            log('Transaction', 'Stripe Api access is not configured!');
        }
    };

    deleteCustomer(id, cb) {
        stripe.customers.del(id, cb);
    };

    getCustomer(stripeId, cb) {
        stripe.customers.retrieve(stripeId, cb);
    }

    updateCustomer(stripeId, entity, cb) {
        stripe.customers.update(stripeId, {
            card: entity.stripeToken,
            email: entity.email,
            description: 'Created with lilium'
        }, (err, customer) => {
            if (err) log('Transaction', err);
            return cb(customer.id);
        });
    };

    charge(charge, cb) {
        stripe.charges.create(charge, cb);
    };

    processCharge(charge, cb) {
        stripe.charges.capture(charge.id, cb)
    };


    createNewCustomer(entity, cb) {
        stripe.customers.create({
            card: entity.stripeToken,
            email: entity.email,
            description: 'Created with lilium'
        },
        (err, customer) => {
            if (err) log('Transaction', err);
            return cb(customer.id);
        });
    };
};

module.exports = new Transaction();
