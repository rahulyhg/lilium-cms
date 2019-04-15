const db = require('../lib/db');
const _c = require('../lib/config');
const dateFormat = require('dateformat');
const request = require('request');

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

    stripeCallback(cli) {
        if (cli.userinfo && cli.userinfo.loggedin && cli.routeinfo.params.code) {
            const userid = db.mongoID(cli.userinfo.userid);
            const code = cli.routeinfo.params.code;

            log('Stripe', 'Received OAuth code ' + code, 'success');

            request({
                method : "POST",
                form : {
                    code,
                    client_secret : money.getConfig().sk,
                    grant_type : "authorization_code"
                },
                uri : "https://connect.stripe.com/oauth/token"
            }, (err, text, textadmin) => {
                const stripejson = JSON.parse(text);

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
