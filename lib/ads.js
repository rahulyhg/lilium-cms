const db = require('../lib/db');
const config = require('../lib/config');
const filelogic = require('../pipeline/filelogic');
const hooks = require('../lib/hooks');
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
        return page.includes('lml-adplaceholder');
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
}

module.exports = new AdsLib();
