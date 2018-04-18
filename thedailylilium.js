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

const Analytics = require('./analytics');
const db = require('./includes/db');
const dashboard = require('./dashboard');
const dateformat = require('dateformat');

class TheDailyLilium {
    storeEntry(_c, datetime, done) {
        log('DailyLilium', "Generating The Daily Lilium entry for date " + datetime, 'info');
        const _d = require('./config').default();

        const temp = new Date(datetime);
        const datestart = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 0, 0, 0);
        const dateend = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 23,59,59);

        const report = {};
        Analytics.addSite(_c, () => {
            if (!_c.analytics || !_c.analytics.jsonkeypath) {
                return done && done();
            }

            Analytics.generateYesterdayReport(_c, yesterday => {
                console.log(yesterday);
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
                            report.decorations = decorations;
                            
                            db.join(_c, 'content', [
                                { $match : { $and : [ { date : { $gte : datestart } }, { date : { $lte : dateend } } ] } },
                                { $project : {
                                    headline : { $arrayElemAt : ["$title", 0] },
                                    author : 1, isSponsored : 1, topic : 1
                                } }
                            ], articles => {   
                                log('DailyLilium', "Fetched all published articles from provided date", 'detail');
                                report.articles = articles;

                                dashboard.getQuote(quote => {
                                    log('DailyLilium', "Got daily quote", 'detail');
                                    report.quote = quote;
                                    
                                    db.join(_c, 'searches', [
                                        { $match : { $and : [ { at : { $gte : datestart.getTime() } }, { at : { $lte : dateend.getTime() } } ] } }, 
                                        { $group : { _id : "$terms", total : { $sum : 1 }} }, 
                                        { $sort : { total : -1 }}, 
                                        { $limit : 5 }, 
                                        { $project : { total : 1, terms : "$_id", _id : 0 } }
                                    ], topsearches => {
                                        log('DailyLilium', "Fetched top searches from database", 'detail');
                                        report.topsearches = topsearches;
                                        report._id = dateformat(datestart, "ddmmyyyy");

                                        db.rawCollection(_c, 'thedailylilium', {}, (err, col) => {
                                            col.updateOne({ _id : report._id }, report, {
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

module.exports = new TheDailyLilium();
