const log = require('./log');
const db = require('./includes/db');
const config = require('./config');
const filelogic = require('./filelogic');
const _patterns = {};

class AdPatterns {
    constructor(name, description, detectcb, applicationcb) {
        this.name = name;
        this.description = description; 
        this.detectcb = detectcb;
        this.application = applicationcb;
    }
 
    // List of nodes
    detect(window) {
        return this.detectcb(window.document.body, window.document.body.children);
    }

    applyPattern(window) {
        try {
            this.application(window);
        } catch (ex) {
            log('Ads', 'Error applying pattern ' + this.name + " : " + ex, 'err');
        }
        return this;
    }
}

class AdsLib {
    createPattern(name, desc, detect, apply) {
        return new AdPatterns(name, desc, detect, apply);
    }

    registerPattern(siteid, pattern) {
        if (pattern.name == "default") {
            _patterns[siteid].default = pattern;
        } else {
            _patterns[siteid].push(pattern);
        }
    }

    registerSite(siteid) {
        _patterns[siteid] = [];
    }

    articleContainsAds(article) {
        return !article.content.map(x => this.pageContainsAds(x)).includes(false);
    }

    pageContainsAds(page) {
        return page.includes('<ad>');
    }

    detectPatternType(siteid, plist) {
        let index = "default";
        _patterns[siteid].every((pat, i) => { 
            if (!pat.detect(plist)) {
                return true;
            }

            index = i;
            return false;
        })

        return _patterns[siteid][index];
    }

    adminGET(cli) {
        if (!cli.hasRight('admin')) {
            return cli.throwHTTP(403);
        }   

        filelogic.serveAdminLML3(cli);
    }

    adminPOST(cli) {
        if (!cli.hasRight('admin')) {
            return cli.throwHTTP(403);
        }   

        const ads = cli.postdata.data.ads;
        db.remove(cli._c, 'ads', {}, () => {
            db.insert(cli._c, 'ads', ads, () => {
                cli.sendJSON({ total : ads.length });
            });
        });
    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight('admin')) {
            return cli.throwHTTP(403);
        }   

        const levelOne = levels[0];
        if (levelOne == "list") {
            db.find(cli._c, "ads", {}, [], (err, cur) => {
                cur.sort({_id : 1}).toArray((err, arr) => {
                    sendback(arr);
                });
            });
        } else {
            sendback("");
        }
    }

    setup() {
        config.getAllSites().forEach(site => db.createCollection(site, 'ads', () => {}));
    }
}

module.exports = new AdsLib();
