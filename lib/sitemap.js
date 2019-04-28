const db            = require('../lib/db.js');
const fs            = require('fs');
const scheduler     = require('./scheduler.js');
const dateformat    = require('dateformat');

const XMLSitemap = {
    header : '<?xml version="1.0" encoding="UTF-8"?>',
    files : {
        index : "/sitemap.xml",
        post : "/sitemap_posts.xml",
        topic : "/sitemap_topics.xml",
        author : "/sitemap_authors.xml"
    },
    defaultfreq : "hourly",
    defaultprio : 0.5,
    homepageprio : 0.6,
    postlimit : 200,
    refreshrate : "hour"
}

const cachedTopicAssoc = {};

class Sitemap {
    getEntryString(url, date, freq, prio) {
        date = dateformat(new Date(date || new Date()), "yyyy-mm-dd");

        return "<url>" + 
                "<loc>"+url+"</loc>" +
                "<lastmod>"+date+"</lastmod>" +
                "<changefreq>"+(freq||XMLSitemap.defaultfreq)+"</changefreq>" +
                "<priority>"+(prio||XMLSitemap.defaultprio)+"</priority>" +
            "</url>";
    }

    getSitemapString(url) {
        return "<sitemap>" +
                "<loc>"+url+"</loc>" +
                "<lastmod>"+dateformat(new Date(), "yyyy-mm-dd")+"</lastmod>" +
            "</sitemap>"
    }

    // Sitemaps file
    createHomepageIndex(conf, done) {
        log("Sitemap", "Generating index sitemap");
        let content = XMLSitemap.header + 
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
                this.getSitemapString(conf.server.protocol + conf.server.url + XMLSitemap.files.post) +
                this.getSitemapString(conf.server.protocol + conf.server.url + XMLSitemap.files.topic) +
                this.getSitemapString(conf.server.protocol + conf.server.url + XMLSitemap.files.author) +
            '</sitemapindex>';

        fs.writeFile(
            conf.server.html + XMLSitemap.files.index, 
            content,
            { encoding : 'utf8' },
            () => done && done()
        );
    }

    // Must be called after .createTopicIndex
    createPostIndex(conf, done) {
        log("Sitemap", "Generating post sitemap");
        let handleArticles = (err, articles) => {
            let content = XMLSitemap.header + 
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + 
                this.getEntryString(conf.server.protocol + conf.server.url, new Date(), "always", XMLSitemap.homepageprio);

            for (let i = 0; i < articles.length; i++) if (articles[i].topic) {
                content += this.getEntryString(
                    conf.server.protocol + conf.server.url + "/" + cachedTopicAssoc[articles[i].topic] + "/" + articles[i].name,
                    articles[i].date,
                    "monthly"
                );
            }

            fs.writeFile(
                conf.server.html + XMLSitemap.files.post, 
                content + "</urlset>",
                { encoding : 'utf8' },
                () => done && done()
            );
        };

        db.findToArray(conf, 'content', {status : "published"}, handleArticles.bind(this), {
            topic : 1,
            name : 1,
            date : 1
        }, 0, XMLSitemap.postlimit, true);
    }

    createTopicIndex(conf, done) {
        log("Sitemap", "Generating topic sitemap");
        let parseTopics = (err, topics) => {
            let content = XMLSitemap.header + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

            for (let ti = 0; ti < topics.length; ti++) {
                let topic = topics[ti];
                content += this.getEntryString(conf.server.protocol + conf.server.url + "/" + topic.completeSlug, new Date(), "weekly");

                cachedTopicAssoc[topic._id] = topic.completeSlug;
            }

            fs.writeFile(
                conf.server.html + XMLSitemap.files.topic, 
                content + "</urlset>",
                { encoding : 'utf8' },
                () => done && done()
            );
        }

        db.findToArray(conf, 'topics', {active : true}, parseTopics.bind(this));
    }

    createAuthorIndex(conf, done) {
        log("Sitemap", "Generating author sitemap");
        let parseAuthors = (err, authors) => {
            let content = XMLSitemap.header + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
                    
            for (let ai = 0; ai < authors.length; ai++) {
                let author = authors[ai];
                content += this.getEntryString(conf.server.protocol + conf.server.url + "/author/" + author.slug, new Date(), 'hourly');
            }

            fs.writeFile(
                conf.server.html + XMLSitemap.files.author, 
                content + "</urlset>",
                { encoding : 'utf8' },
                () => done && done()
            );
        };

        db.findToArray(
            require('../lib/config').default(), 
            'entities', 
            {roles : {$in : ["author", "contributor"]}, revoked : {$ne : false}}, 
            parseAuthors.bind(this)
        );
    }

    generateSitemap(conf, done) {
        let that = this;
        log("Sitemap", "Generating website sitemap", 'info');
        that.createTopicIndex(conf, () => {
            that.createAuthorIndex(conf, () => {
                that.createPostIndex(conf, () => {
                    that.createHomepageIndex(conf, () => {
                        log("Sitemap", "Generated sitemap for website " + conf.server.protocol + conf.server.url, 'success');
                        done && done();
                    });
                });
            });
        });
    }

    scheduleCreation(conf, runRightNow, done) {
        scheduler.schedule('sitemaps', {
            every : XMLSitemap.refreshrate
        }, this.generateSitemap.bind(this));

        runRightNow && this.generateSitemap(conf, done);
    }
}

module.exports = new Sitemap();
