const log = require('./log');

/*
 *  Patterns
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
    static detech(plist) {
        
    }
}

class AdsLib {
    articleContainsAds(article) {
        return !article.content.map(x => this.pageContainsAds(x)).includes(false);
    }

    pageContainsAds(page) {
        return page.includes('<ad>');
    }

    detectPatternType(plist) {

    }

    smartInsert(dom) {
        const nodes = dom.window.document.body.children;
        const pattern = this.detectPatternType(plist);

        Array.prototype.forEach.call(nodes, x => {
            
        });

    }
}

module.exports = new AdsLib();
