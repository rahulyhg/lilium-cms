const filelogic = require('../pipeline/filelogic');
const db = require('../lib/db');
const _c = require('../lib/config');
const dateFormat = require('dateformat');
const Money = require("../lib/money");
const twoFactor = require('../lib/twoFactor');
const contractorsLib = require('../lib/contractorspayments');

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
    GET(cli) {
        if (!cli.isLoggedIn) {
            cli.redirect(cli._c.server.protocol + cli._c.server.url + "/login");
        } else if (cli.routeinfo.path[0] == "liliumstripecallback" && cli.routeinfo.params.code) {
            contractorsLib.stripeCallback(cli);
        } else if (!isNaN(cli.routeinfo.path[1])) {
            const $match = { number : parseInt(cli.routeinfo.path[1]) };
            if (!cli.hasRight('manage-contractors')) {
                $match.to = db.mongoID(cli.userinfo.userid);
            }

            db.findUnique(require("../lib/config").default(), 'contractorinvoices', $match, (err, invoice) => {
                if (!invoice) {
                    return cli.throwHTTP(404, undefined, true);
                }
                
                db.findUnique(
                    require("../lib/config").default(), 
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
        } else {
            cli.throwHTTP(404, undefined, true);
        }
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
            
            if (twoFactor.validate2fa(cli.userinfo.userid, dat.secret)) {
                cli.sendJSON({ working : true });
                money.dispatchPending(dat.ids, db.mongoID(cli.userinfo.userid), () => {
                    require(liliumroot + "/notifications").notifyUser(
                        cli.userinfo.userid, 
                        require("../lib/config").default(),
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

    adminPUT(cli) {
        if (cli.routeinfo.path[2] == "changeArticleWorth") {
            if (cli.routeinfo.path[2] && db.isValidMongoID(cli.routeinfo.path[3])) {
                cli.readPostData(postdata => {
                    if (postdata.worth >= 0) {
                        if (cli.hasRightOrRefuse('manage-contractors')) {
                            contractorsLib.changeArticleWorth(cli, cli.routeinfo.path[3], postdata.worth, err => {
                                if (!err) {
                                    cli.sendJSON({ success: true });
                                } else {
                                    cli.throwHTTP(500, 'Error updating article worth', true);
                                }
                            });
                        }
                    } else {
                        cli.throwHTTP(400, 'Positive integer article worth required', true);
                    }
                });
            } else {
                cli.throwHTTP(400, 'ArticleId parameter required', true);
            }
        } else {
            cli.throwHTTP(404, undefined, true);
        }
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

            db.join(require("../lib/config").default(), 'contractorinvoices', [
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
            db.findUnique(require("../lib/config").default(), 'entities', { 
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
