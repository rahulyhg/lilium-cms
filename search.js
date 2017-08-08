const log = require('./log.js');
const db = require('./includes/db.js');

const PROJECTION = {
    title : 1, subtitle : 1, media : 1, topic : 1, 
};

const IMAGE_LOOKUP = {
    from         : "uploads",
    localField   : "media",
    foreignField : "_id",
    as           : "featuredimage"
};

const SELECTOR = (words) => {
    return {
        status : "published",
        $text : { $search : words }
    };
}

class ContentSearch {
    getContent(_c, topic, terms, options, send) {
        const max = options.max || 30;
        const page = options.page || 0;
        const conditions = Object.assign(SELECTOR(terms), options.conditions || {});

        db.join(_c, 'content', [
            {$match : conditions},
            {$skip : page * max},
            {$limit : max},
            {$sort: { score: { $meta: "textScore" } } },
            {$project : PROJECTION},
            {$lookup : IMAGE_LOOKUP}
        ], (arr) => {
            
        });
    }
}

module.exports = new ContentSearch();
