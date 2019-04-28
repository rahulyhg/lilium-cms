const Controller = require('../base/controller');
const db = require('../lib/db');
const dateformat = require('dateformat');
const tdllib = require('../lib/thedailylilium');

const SERVER_TIMEZONE_OFFSET = new Date().getTimezoneOffset();

class TheDailyLilium extends Controller {
    adminPOST(cli) {
        const action = cli.routeinfo.path[2];
        const _id = db.mongoID(cli.routeinfo.path[3]);

        switch (action) {
            case "make":
                const headline = cli.postdata.data.headline;
                const author = db.mongoID(cli.userinfo.userid);
                const article = {
                    headline, author, 

                    createdOn : new Date(),
                    content : "<p>Write something amazing.</p>",
                    editionOf : require('dateformat')(new Date(Date.now() + 1000 * 60 * 60 * 24), "ddmmyyyy"),
                    mediasrc : "",
                    status : "draft"
                }

                db.insert(require('./lib/config').default(), 'tdlposts', article, (err, r) => {
                    cli.sendJSON({ articleid : article._id, error : err });
                });
                break;

            case "save":
                const updated = cli.postdata.data;
                db.update(require('./lib/config').default(), 'tdlposts', {_id}, updated, (err) => cli.sendJSON({ok:!err}));
                break;

            default:
                cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, sendback) {
        const action = levels[0];

        if (action == "bunch") {
            const $match = {
                status : params.filters.status || {$ne : "destroyed"}
            };

            if (params.filters.search) {
                $match.headline = new RegExp(params.filters.search, 'i');
            }

            db.join(require('./lib/config').default(), 'tdlposts', [
                { $match },
                { $sort : { _id : -1 } },
                { $limit : 50 }
            ], items => {
                sendback({ items, total : items.length });
            });
        } else if (action == "single") {
            db.join(require('./lib/config').default(), 'tdlposts', [
                { $match : { _id : db.mongoID(levels[1]) } }
            ], arr => {
                sendback(arr[0]);
            });
        } else if (action == "yesterday") {
            const temp = new Date();
            let datestart = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate() - 1, 0, temp.getTime() - ((1000 * 60 * params.tzoffset) - SERVER_TIMEZONE_OFFSET), 0); 
            const _id = dateformat(datestart, "ddmmyyyy") + tzoffset + "-day";

            db.findUnique(cli._c, 'thedailylilium', { _id }, (err, report) => {
                // db.findToArray(require('./lib/config').default(), 'tdlposts', { editionOf : _id }, (err, customposts) => {
                    if (!report) {
                        tdllib.storeYesterday(cli._c, datestart, _id, report => {
                            // report.customposts = customposts;
                            sendback(report);
                        });
                    } else {
                        // report.customposts = customposts;
                        sendback(report);
                    }
                // });
            });
        } else if (action == "lastweek") {
            const temp = new Date();
            let datestart = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate() - 1, 0, temp.getTime() - ((1000 * 60 * params.tzoffset) - SERVER_TIMEZONE_OFFSET), 0);             
            const _id = dateformat(datestart, "ddmmyyyy") + tzoffset + "-week";

            db.findUnique(cli._c, 'thedailylilium', { _id }, (err, report) => {
                if (!report) {
                    tdllib.storeYesterday(cli._c, datestart, _id, report => {
                        sendback(report);
                    });
                } else {
                    sendback(report);
                }
            });
        } else if (action == "lastmonth") {

        } else {
            sendback({ ok : "nope" });
        }
    }
}

module.exports = new TheDailyLilium();
