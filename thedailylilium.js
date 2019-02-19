/*
# The Daily Lilium
## What to include

### Merge all sites and pages

+ Top post
+ Badges acquired
+ Articles published
+ Total page views, sessions
- New users
+ Quote of the day
- Total sponsored posts
- Total social interactions on Facebook
- Sources like Facebook, Google, Twitter, etc.
+ Top searches
- Most popular topic
- Instagram followers

### Custom articles

- Include custom articles published from a different page
*/

const Analytics = require('./lib/analytics');
const db = require('./lib/db');
const dashboard = require('./lib/dashboard');
const dateformat = require('dateformat');
const hooks = require('./lib/hooks')

const SERVER_TIMEZONE_OFFSET = new Date().getTimezoneOffset();

class TheDailyLilium {
    storeYesterday(_c, datetime, _id, done) {
        log('DailyLilium', "Generating The Daily Lilium entry for date " + datetime, 'info');
        const _d = require('./lib/config').default();

        const temp = new Date(datetime);
        const datestart = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 0, 0, 0);
        const dateend = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 23,59,59);

        const report = { _id };
        Analytics.addSite(_c, () => {
            if (!_c.analytics || !_c.analytics.jsonkeypath) {
                return done && done();
            }

            Analytics.generateYesterdayReport(_c, yesterday => {
                log('DailyLilium', "Got stats from Analytics", 'detail');
                report.os = yesterday.os.rows.map(x => { return { os : x[0], users : x[1] } });
                report.stats = yesterday.traffic.totalsForAllResults;
                const toppage = yesterday.traffic.rows[0][0];
                
                db.join(_c, 'content', [
                    { $match : { name : toppage.split('/').pop() } },
                    { $lookup : { from : "uploads", as : "fullmedia", localField : "media", foreignField : "_id" } },
                    { $project : {
                        headline : { $arrayElemAt : ["$title", 0] }, subline : { $arrayElemAt : ["$subtitle", 0] }, 
                        "fullmedia.sizes.facebook.url": 1, date : 1, author : 1
                    } }
                ], toparticle => {
                    log('DailyLilium', "Fetch top article from database", 'detail');
                    report.toparticle = toparticle.pop();
                    report.toparticle.fullmedia = report.toparticle.fullmedia[0].sizes.facebook.url;
                    report.toparticle.pageviews = yesterday.traffic.rows[0][2];

                    db.findUnique(_d, 'entities', { _id : report.toparticle.author }, (err, author) => {
                        log('DailyLilium', "Fetched author of top article", 'detail');
                        report.toparticle.authorname = author.displayname;
                        report.toparticle.authorphoto = author.avatarURL; 

                        db.join(_d, 'decorations', [
                            { $match : { $and : [ { on : { $gte : datestart } }, { on : { $lte : dateend } } ] } },
                            { $lookup : { from : 'entities', as : 'fullentity', localField : 'entity', foreignField : '_id' } },
                            { $project : {
                                slug : 1, level : 1, "fullentity.displayname" : 1, "fullentity.avatarURL" : 1
                            } }
                        ], decorations => {
                            log('DailyLilium', "Fetched all new decorations with full author", 'detail');
                            const { DEFAULT_BADGES_ASSOC, BADGE_LEVEL_TEXT } = require('./lib/badges').getDecorationSettings();
                            report.decorations = decorations;
                            decorations.forEach(x => {
                                x.reason = DEFAULT_BADGES_ASSOC[x.slug].reason.replace('<n>', DEFAULT_BADGES_ASSOC[x.slug].levels[x.level]);
                                x.displayname = DEFAULT_BADGES_ASSOC[x.slug].displayname;
                                x.title = BADGE_LEVEL_TEXT[x.level];
                                x.icon = DEFAULT_BADGES_ASSOC[x.slug].icon;
                                x.fullentity = x.fullentity.pop();
                            });
                            
                            db.join(_c, 'content', [
                                { $match : { $and : [ { date : { $gte : datestart } }, { date : { $lte : dateend } } ] } },
                                { $lookup : { from : "uploads", as : "fullmedia", localField : "media", foreignField : "_id" } },
                                { $lookup : { from : "editions", as : "fulleditions", localField : "editions", foreignField : "_id" } },
                                { $project : {
                                    headline : { $arrayElemAt : ["$title", 0] },
                                    author : 1, isSponsored : 1, 
                                    "fullmedia.sizes.square.url": 1,
                                    "editions.displayname" : 1,
                                    "editions._id" : 1
                                } }
                            ], articles => {   
                                log('DailyLilium', "Fetched all published articles from provided date", 'detail');
                                report.articles = articles;
                                articles.forEach(x => {
                                    x.fullmedia = x.fullmedia[0].sizes.square.url;
                                    x.fulledition = x.fulledition[0].displayname;
                                });     

                                dashboard.getQuote(quote => {
                                    log('DailyLilium', "Got daily quote", 'detail');
                                    report.quote = quote;
                                    
                                    db.join(_c, 'searches', [
                                        { $match : { $and : [ { at : { $gte : datestart.getTime() } }, { at : { $lte : dateend.getTime() } } ] } }, 
                                        { $group : { _id : "$terms", total : { $sum : 1 }} }, 
                                        { $sort : { total : -1 }}, 
                                        { $limit : 10 }, 
                                        { $project : { total : 1, terms : "$_id", _id : 0 } }
                                    ], topsearches => {
                                        log('DailyLilium', "Fetched top searches from database", 'detail');
                                        report.topsearches = topsearches;

                                        db.rawCollection(_c, 'thedailylilium', {}, (err, col) => {
                                            hooks.fireSite(_c, 'dailyLiliumGenerate', {report})
                                            col.replaceOne({ _id : report._id, tzoffset }, report, {
                                                upsert : 1
                                            }, (err, r) => {
                                                log('DailyLilium', "Inserted report inside database", "success");
                                                done && done(report);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });       
        });       
    }
    
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
                        this.storeYesterday(cli._c, datestart, _id, report => {
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
                    this.storeYesterday(cli._c, datestart, _id, report => {
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
