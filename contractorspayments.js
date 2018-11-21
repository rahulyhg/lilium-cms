const filelogic = require("./filelogic");
const db = require('./includes/db');
const _c = require('./config');
const dateFormat = require('dateformat');
const Money = require("./money");
const request = require('request');
const CryptoJS = require('crypto-js');
const twoFactor = require('./twoFactor');

const money = new Money();

const PAYMENT_STATUSES = {
    notready : "Not published",
    pending : "Pending",
    paid : "Paid"
}

const STATUSES = {
    published : "Published",
    draft : "Draft",
    deleted : "Back to draft",
    reviewing : "Pending review"
};

class ContractorHandler {
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
            }, (err, resp, text) => {
                const stripejson = JSON.parse(text);

                if (stripejson.error) {
                    log('Stripe', stripejson.error_description, 'err');
                    return cli.redirect(cli._c.server.protocol + cli._c.server.url + "/admin/stripeerror");
                }

                db.update(require(liliumroot + "/config").default(), 'entities', { 
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
                    cli.redirect(cli._c.server.protocol + cli._c.server.url + "/admin/contractordash");
                });
            });
        } else {
            cli.throwHTTP(404);
        }
    }

    adminEditArticlePost(cli) {
        if (!cli.hasRight("manage-contractors")) {
            return cli.refuse();
        }
        
        require(liliumroot + "/config").each((_c, next) => {
            db.update(_c, 'content', { _id : db.mongoID(cli.routeinfo.path[2]) }, { worth : parseInt(cli.postdata.data.worth) }, () => next());
        }, () => {
            cli.sendJSON({ok : 1});
        });
    }

    adminPOST(cli) {
        if (!cli.hasRight("manage-contractors")) {
            return cli.refuse();
        }

        const action = cli.routeinfo.path[2];

        if (action == "generate") {
            const dat = cli.postdata.data;
            if (!dat.secret || !dat.ids || dat.ids.length == 0) {
                return cli.throwHTTP(400, undefined, true);
            }
            if (dat.ids.filter(i => !i.id || !i.currency).length != 0) {
                return cli.throwHTTP(400, undefined, true);
            }
            
            if (twoFactor.validate2fa(cli.userinfo.user, dat.secret)) {
                cli.sendJSON({ working : true });
                money.dispatchPending(dat.ids, db.mongoID(cli.userinfo.userid), () => {
                    require(liliumroot + "/notifications").notifyUser(
                        cli.userinfo.userid, 
                        require(liliumroot + "/config").default(),
                        {done : true},
                        "managecontractors"
                    );
                });
            } else {
                cli.throwHTTP(403, 'Unauthorized because of wrong 2FA', true);
            }
        } else if (action == "retry") {
            const number = parseInt(cli.routeinfo.path[3]);
            if (number) {
                money.retryFailedTransaction(number, (err, invoice) => {
                    cli.sendJSON({ err, invoice });
                });
            } else {
                cli.sendJSON({err : "Invalid invoice number"})
            }
        } else {
            cli.refuse();
        }
    }

    generateInvoicePage(cli) {
        if (!cli.isLoggedIn || !cli.routeinfo.path[1] || isNaN(cli.routeinfo.path[1])) {
            return cli.redirect(cli._c.server.protocol + cli._c.server.url + "/login");
        }

        const $match = { number : parseInt(cli.routeinfo.path[1]) };
        if (!cli.hasRight('manage-contractors')) {
            $match.to = db.mongoID(cli.userinfo.userid);
        }

        db.findUnique(require(liliumroot + "/config").default(), 'contractorinvoices', $match, (err, invoice) => {
            if (!invoice) {
                return cli.throwHTTP(404, undefined, true);
            }
            
            db.findUnique(
                require(liliumroot + "/config").default(), 
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

    livevarManage(cli, levels, params, sendback) {
        if (!cli.hasRight("manage-contractors")) {
            return cli.refuse();
        }

        const levelone = levels[0];
        
        if (levelone == "pending") {
            const $match = {
                paymentstatus : "pending",
                status : "published"
            };

            db.networkJoin('content', [
                { $match },
                { $project : { title : 1, worth : 1, author : 1, date : 1 } }
            ], posts => {
                const cids = [...new Set(posts.map( x => x.author ))];

                db.findToArray(_c.default(), 'entities', { _id : { $in : cids } }, (err, authors) => {
                    const resp = {};
                    let totalowed = 0;

                    authors.forEach( x => { 
                        x.articles = []; 
                        x.owed = 0; 

                        resp[x._id] = x; 
                    });
                    posts.forEach(x => { 
                        resp[x.author].articles.push(x); 
                        resp[x.author].owed += x.worth; 

                        x.pages = x.title.length;
                        x.title = x.title[0];
                        totalowed += x.worth;
                    });

                    sendback({ contractors : Object.values(resp), totalowed });
                }, { displayname : 1, avatarURL : 1, stripeuserid : 1, currency: 1, isBeingPaid: 1 });
            });
        } else if (levelone == "invoices") {
            if (cli.hasRightOrRefuse('manage-contractors')) {
                const conds = [
                    {$sort: {number: -1}},
                    {$skip: params.filters.skip || 0},
                    {$limit: params.filters.limit || 30}
                ];
                
                if (params.filters.number) {
                    const number = parseInt(params.filters.number);
                    
                    conds.push({$match: {
                        $or: [
                            { number: number },
                            { total: number }
                        ]
                    }});
                }

                db.join(_c.default(), 'contractorinvoices', conds, (items) => {
                    sendback({ items: items });
                });
            }
        }
    }

    livevar(cli, levels, params, sendback) {
        const items = [];
        const levelone = levels[0];
        
        if (levelone == 'management') {
            const managementLevels = levels;
            managementLevels.splice(0, 1);
            this.livevarManage(cli, managementLevels, params, sendback);
        } else if (levelone == "posts") {
            const $match = {
                author : db.mongoID(cli.userinfo.userid),
                paymentstatus : { $ne : "paid" },
                status : { $ne : "destroyed" }
            }

            if (params.filters) {
                if (params.filters.status) {
                    $match.status = params.filters.status;
                }

                if (params.filters.paymentstatus) {
                    $match.paymentstatus = params.filters.paymentstatus;
                }

                if (params.filters.search) {
                    $match.title = new RegExp(params.filters.search, 'i');
                }
            }

            db.networkJoin('content', [
                { $match },
                { $project : {
                    title : 1, subtitle : 1, status : 1, 
                    paymentstatus : 1, date : 1, worth : 1
                }},
                { $sort : { _id : -1 } }
            ], (arr) => {
                arr.forEach(x => {
                    x.worth = x.worth ? (x.worth + "$") : "N/A";
                    x.date = x.date ? dateFormat(x.date, "yyyy/mm/dd HH:MM") : "No publication date";
                    x.paymentstatus = PAYMENT_STATUSES[x.paymentstatus || "notready"];
                    x.status = STATUSES[x.status];
                });
                           
                sendback({ items : arr });
            });
        } else if (levelone == "nextpayout") {
            db.networkJoin('content', [
                { $match : {
                    author : db.mongoID(cli.userinfo.userid),
                    paymentstatus : "pending",
                    status : "published"
                }},
            ], (arr) => {
                const amount = arr.reduce((total, x) => total + x.worth, 0);
                sendback({ amount, totalposts : arr.length });
            });
        } else if (levelone == "allinvoices") {
            if (!cli.hasRight('manage-contractors')) {
                return sendback([]);
            }

            db.join(require(liliumroot + "/config").default(), 'contractorinvoices', [
                { $sort : { _id : -1 } },
                { $lookup : {
                    from : "entities", 
                    as : "contractor",
                    localField : "to",
                    foreignField : "_id"
                } }, {
                    $unwind : "$contractor"
                }, {
                    $project : {
                        total : 1, at : 1, currency : 1, transactionid : 1, number : 1, items : {
                            $size : "$products"
                        }, contractor : "$contractor.displayname", valid : 1, resolved : 1
                    } 
                }], items => sendback(items));
        } else if (levelone == "invoices") {
            db.join(_c.default(), 'contractorinvoices', [
                { $match : { to : db.mongoID(cli.userinfo.userid) }},
                { $sort : { _id : -1 } }, {
                    $project : {
                        total : 1, at : 1, currency : 1, transactionid : 1, number : 1, items : {
                            $size : "$products"
                        }
                    }
                }
            ], items => sendback(items));
        } else if (levelone == "code") {
            db.findUnique(require(liliumroot + "/config").default(), 'entities', { 
                _id : db.mongoID(cli.userinfo.userid) 
            }, (err, entity) => {
                sendback(entity);
            }, {
                displayname : 1,
                stripeuserid : 1,
                stripepk : 1,
                stripecode : 1,
                stripeoauth : 1,
                stripeauthfrom : 1,
                stripecodeat : 1
            });
        } else {
            cli.throwHTTP(404, 'Not Found', true);
        }
    }
}

module.exports = new ContractorHandler();
