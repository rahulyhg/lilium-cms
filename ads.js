const log = require('./log');
const _patterns = {};

/*
 *  PATTERNS -----
 *
 *      textwithseparators
 *          A list of multiple paragraphs without subtitles and various seperators such as images and embeds
 *
 *      bulletlist
 *          Close to no paragraphs with a big bulleted list of items
 *
 *      biglistlanding
 *          A few paragraphs with a list of links
 *
 *      listoftweets
 *          Multiple tweets with or without title
 *
 *      subpictextpattern
 *          A pattern similar to subtitle, one or two pictures, text, maybe a horizontal ruler 
 *
 *      shortpiece
 *          A few paragraphs with close to no decoration
 *
 *      gallery
 *          A lot of images with very little text and maybe an intro
 *
 *      story
 *          Multiple paragraphs with close to no decoration
 *
 * */
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

    registerPattern(siteid, pattern, isDefault) {
        if (isDefault) {
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
