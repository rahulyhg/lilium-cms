const db = require(liliumroot + "/includes/db");
const sharedcache = require(liliumroot + "/sharedcache");
const mailLib = require(liliumroot + "/mail");
const Stripe = require('stripe');
const LML3 = require(liliumroot + '/lml3/compiler');

// Singleton
let stripeconfig; // sk, pk, connectid
let stripe;

const CURRENCIES = [];

module.exports = class Money {
    static preloadCurrencies() {
        log('Money', 'Loading currencies from directory', 'info');
        const fs = require('fs');
        const files = fs.readdirSync('./currency');

        files.forEach(file => CURRENCIES.push(require("./currency/" + file)));
        log('Money', 'Loaded a total of ' + CURRENCIES.length + ' currencies', 'success');
    }

    getConfig() {
        if (stripeconfig) {
            return stripeconfig;
        }

        stripeconfig = require(liliumroot + "/../keys/stripe.json");
        if (!stripeconfig.sk || !stripeconfig.pk) {
            throw new Error("Invalid Stripe JSON file. Make sure stripe.json file exists");
        }

        return stripeconfig;
    }

    getStripe() {
        if (stripe) {
            return stripe;
        }

        if (!stripeconfig) {
            this.getConfig();
        } else if (!stripeconfig.sk || !stripeconfig.pk) {
            throw new Error("Invalid Stripe JSON file. Make sure stripe.json file exists");
        }

        stripe = Stripe(stripeconfig.sk);
        return stripe;
    }

    dispatchOne(contractorid, currency, requester, done) {
        const mainsite = require(liliumroot + '/config').default();

        // Fetch full contractor entity
        db.findUnique(mainsite, 'entities', { _id : contractorid }, (err, contractor) => {
            // Request pending articles
            db.networkJoin('content', [
                { $match : { author : contractorid, paymentstatus : "pending", status : "published" } },
                { $lookup : { from : "topics", as : "fulltopic", localField : "topic", foreignField : "_id" } },
                { $unwind : "$fulltopic" },
                { $project : { headline : { $arrayElemAt : [ "$title", 0 ] }, worth : 1, topicslug : "$fulltopic.completeSlug", name : 1 } }
            ], (posts, dbposts) => {
                // Generate invoice
                db.join(mainsite, 'contractorinvoices', [{ $sort : { _id : -1 }}, { $project : {number : 1} }, { $limit : 1} ], arr => {
                    const numberplusone = arr[0] ? (arr[0].number + 1) : 100000;
                    const total = posts.reduce((total, post) => total + post.worth, 0);
                    const invoice = {
                        number : numberplusone,
                        products : posts,
                        total : total,
                        invoiceType : "contractor",
                        date : new Date(),
                        at : Date.now(),
                        from : "Narcity Media",
                        to : contractorid,
                        currency : currency,
                        generatedBy : requester
                    };

                    const source = this.getConfig().source[currency] || this.getConfig().source.default;
                    this.sendStripePayoutRequest(numberplusone, contractor.stripeuserid, total * 100, currency, source, (err, stripeinvoice) => {
                        invoice.error = err;
                        invoice.valid = !err;

                        if (stripeinvoice) {
                            invoice.stripeid = stripeinvoice.id;
                            invoice.transactionid = stripeinvoice.balance_transaction;
                            invoice.destinationid = stripeinvoice.destination;
                            invoice.transferid = stripeinvoice.transfer;
                        }

                        db.insert(mainsite, 'contractorinvoices', invoice, () => {
                            const sites = Object.keys(dbposts);
                            let siteindex = -1;
                            
                            const handleSite = () => {
                                if (++siteindex == sites.length) {
                                    return done && done();
                                }

                                const siteid = sites[siteindex];
                                db.update(siteid, 'content', { _id : { $in : dbposts[siteid].map(x => x._id) } }, {
                                    paymentstatus : "paid"
                                }, (err, r) => {
                                    if (r && r.modifiedCount != 0 && invoice.valid) {
                                        db.findUnique(require(liliumroot + '/config').default(), 'entities', { _id : contractorid }, (err, contractor) => {
                                            if (contractor && contractor.email) {
                                                require(liliumroot + "/lml3/compiler").compile(
                                                    require(liliumroot + '/config').fetchConfig(siteid), 
                                                    liliumroot + "/plugins/contractors/invoice.lml3",
                                                    { invoice, contractor },
                                                    markup => {
                                                        mailLib.triggerHook(require(liliumroot + '/config').fetchConfig(siteid), 'send_invoice_to_contractor', contractor.email, {
                                                            contractor,
                                                            invoice,
                                                            markup
                                                        }, () => {
                                                            log('Contractor', 'Contractor was notified via email', 'success');
                                                        });
                                                    }
                                                );
                                            }
                                        });
                                    }

                                    handleSite();
                                });
                            };

                            handleSite();
                        });
                    });
                });
            });
        });
    }

    dispatchPending(payload, requester, done) {
        log("Money", "Preparing Stripe requests with a payload of " + payload.length + " contractors", "detail");
        let index = -1;
        const nextItem = () => {
            if (++index == payload.length) {
                return done && done();
            }

            this.dispatchOne(db.mongoID(payload[index].id), payload[index].currency, requester, () => { nextItem(); });
        };

        nextItem();
    }

    retryFailedTransaction(number, done) {
        const mainsite = require(liliumroot + '/config').default();
        db.findUnique(mainsite, 'contractorinvoices', { number, valid : false, resolved : { $ne : true } }, (err, invoice) => {
            if (!invoice) {
                return done("Invoice was either not found or was already resolved.");
            }

            db.findUnique(mainsite, 'entities', { _id : invoice.to }, (err, contractor) => {
                const total = invoice.total * 100;
                const currency = invoice.currency;
                const destination = contractor.stripeuserid;
                const source = this.getConfig().source[currency] || this.getConfig().source.default;

                this.sendStripePayoutRequest(number, destination, total, currency, source, (err, stripeinvoice) => {
                    invoice.date = new Date();
                    invoice.error = err;
                    invoice.valid = !err;
                    invoice.originalid = invoice._id;
                    delete invoice._id;

                    if (stripeinvoice) {
                        invoice.stripeid = stripeinvoice.id;
                        invoice.transactionid = stripeinvoice.balance_transaction;
                        invoice.destinationid = stripeinvoice.destination;
                        invoice.transferid = stripeinvoice.transfer;
                    }

                    db.insert(mainsite, 'contractorinvoices', invoice, () => {
                        db.update(mainsite, 'contractorinvoices', { _id : invoice.originalid }, { resolved : !err }, () => {
                            done(err, stripeinvoice);
                        });
                    });
                });
            });
        });
    }

    sendStripePayoutRequest(invoiceid, destination, amount, currency = "cad", source = "tok_visa", done) {
        this.getStripe().charges.create({
            amount, currency, source,
            description : "Invoice # " + invoiceid + " sent from a contractor to Lilium for a total of " + (amount / 100) + currency,
            transfer_group : invoiceid,
            destination : { account : destination } 
        }, (err, charge) => {
            done && done(err, charge);
        });
    }

    generateOAuthURL(_c) {
        if (!stripeconfig) {
            this.getConfig();
        }

        return stripeconfig.oauth + _c.server.protocol + _c.server.url + "/liliumstripecallback";
    }
};
