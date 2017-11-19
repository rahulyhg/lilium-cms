const log = require('./log');
const _patterns = {};

class AdPatterns {
    constructor(name, description, detectcb, applicationcb) {
        this.name = name;
        this.description = description; 
        this.detectcb = detectcb;
        this.application = applicationcb;
    }
 
    // List of nodes
    detect(nodes) {
        return this.detectcb(nodes);
    }

    applyPattern(window) {
        return this.application(window);
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
        })

        return _patterns[siteid][index];
    }
}

module.exports = new AdsLib();
