const db = require('../lib/db');
const _c = require('../lib/config');
const dateFormat = require('dateformat');
const request = require('request');
const Money = require('./money');

class CtorPaymentCtrl {
    adminEditArticlePost(cli) {
        if (!cli.hasRight("manage-contractors")) {
            return cli.refuse();
        }
        
        require("./config").each((_c, next) => {
            db.update(_c, 'content', { _id : db.mongoID(cli.routeinfo.path[2]) }, { worth : parseInt(cli.postdata.data.worth) }, () => next());
        }, () => {
            cli.sendJSON({ok : 1});
        });
    }

    generateInvoicePage(cli) {
        if (!cli.isLoggedIn || !cli.routeinfo.path[1] || isNaN(cli.routeinfo.path[1])) {
            return cli.redirect(cli._c.server.protocol + cli._c.server.url + "/login");
        }

        const $match = { number : parseInt(cli.routeinfo.path[1]) };
        if (!cli.hasRight('manage-contractors')) {
            $match.to = db.mongoID(cli.userinfo.userid);
        }

        db.findUnique(require("./config").default(), 'contractorinvoices', $match, (err, invoice) => {
            if (!invoice) {
                return cli.throwHTTP(404, undefined, true);
            }

            db.findUnique(
                require("./config").default(), 
                'entities', 
                { _id : invoice.to },
            (err, contractor) => {
                require(liliumroot + "/lml3/compiler").compile(
                    cli._c, 
                    liliumroot + "/backend/dynamic/invoice.lml3",
                    { invoice, contractor },
                    markup => {
                        cli.sendHTML(markup, 200);
                    }
                );
            });
        });
    }

    /**
     * Changes the worth of a specified article
     * @param {object} cli The current client
     * @param {string} articleId The id of the article of which to update the worth
     * @param {number} newWorth The new worth of the article
     * @param {callback} cb Callback to execute once the operation is done
     * @param {object} cb.err Any error that occured while updating the article worth
     */
    changeArticleWorth(cli, articleId, newWorth, cb) {
        db.update(cli._c, 'content', { _id: db.mongoID(articleId) }, { worth: parseInt(newWorth) }, err => {
            if (!err) {
                cb && cb();
            } else {
                cb && cb(err);
            }
        }, undefined, true);
    }

    stripeCallback(cli) {
        if (cli.userinfo && cli.userinfo.loggedin && cli.routeinfo.params.code) {
            const userid = db.mongoID(cli.userinfo.userid);
            const code = cli.routeinfo.params.code;

            log('Stripe', 'Received OAuth code ' + code, 'success');

            const money = new Money();
            request({
                method : "POST",
                form : {
                    code,
                    client_secret : money.getConfig().sk,
                    grant_type : "authorization_code"
                },
                json : true,
                uri : "https://connect.stripe.com/oauth/token"
            }, (err, resp, text)  => {
                let stripejson = text; 

                if (typeof stripejson != "object") {
                    stripejson = JSON.parse(text);
                }

                if (stripejson.error) {
                    log('Stripe', stripejson.error_description, 'err');
                    return cli.redirect(cli._c.server.protocol + cli._c.server.url + "/lilium/dashboard");
                }

                db.update(require("./config").default(), 'entities', {
                    _id : userid 
                }, {
                    stripecode : code,
                    stripetoken : stripejson.access_token,
                    striperefresh : stripejson.refresh_token,
                    stripeuserid : stripejson.stripe_user_id,
                    stripepk : stripejson.stripe_publishable_key,

                    stripeoauth : true,
                    stripeauthfrom : cli._c.server.protocol + cli._c.server.url,
                    stripecodeat : new Date()
                }, (err, r) => {
                    cli.redirect(cli._c.server.protocol + cli._c.server.url + "/lilium/dashboard");
                });
            });
        } else {
            cli.throwHTTP(404);
        }
    }
}

module.exports = new CtorPaymentCtrl();
