const Analytics = require('./analytics');
const db = require('./db');
const dashboard = require('./dashboard');
const hooks = require('./hooks')

class TheDailyLiliumLib {
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
                            const { DEFAULT_BADGES_ASSOC, BADGE_LEVEL_TEXT } = require('./badges').getDecorationSettings();
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
}

module.exports = new TheDailyLiliumLib();
