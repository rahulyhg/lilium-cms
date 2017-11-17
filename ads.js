const log = require('./log');

class AdsLib {
    articleContainsAds(article) {
        return !article.content.map(x => this.pageContainsAds(x)).includes(false);
    }

    pageContainsAds(page) {
        return page.includes('<ad>');
    }

    smartInsert(dom) {
        const nodes = dom.window.document.body.children;
        Array.prototype.forEach.call(nodes, x => {
            
        });

    }
}

module.exports = new AdsLib();
