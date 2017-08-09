const log = require('./log.js');
const db = require('./includes/db.js');

const PROJECTION = {
    title : 1, subtitle : 1, media : 1, topic : 1, status : 1, date : 1, author : 1, _id : 1 
};

const IMAGE_LOOKUP = {
    from         : "uploads",
    localField   : "media",
    foreignField : "_id",
    as           : "featuredimage"
};

const TOPIC_LOOKUP = {
    from         : "topics",
    localField   : "topic",
    foreignField : "_id",
    as           : "deeptopic"
};

const SELECTOR = (words) => {
    return {
        status : {$ne : "destroyed"},
        $text : { $search : words }
    };
}

class ContentSearch {
    queryList(_c, topic, terms, options, send) {
        const max = options.max || 30;
        const page = options.page || 0;
        const conditions = Object.assign(SELECTOR(terms), options.conditions || {});

        db.findToArray(_c, 'topics', { family : topic || "willnotresolve" }, (err, topics) => {
            if (topics.length) {
                conditions.topic = {$in : topics.map(x => x._id)};
            }

            db.join(_c, 'content', [
                {$match : conditions},
                {$sort : {_id : -1}},
                {$sort: { score: { $meta: "textScore" }} },
                {$skip : page * max},
                {$limit : max},
                {$project : PROJECTION},
                {$lookup : TOPIC_LOOKUP},
                {$lookup : IMAGE_LOOKUP}
            ], (arr) => {
                arr.forEach && arr.forEach(x => {
                    x.featuredimage = x.featuredimage.pop();
                    x.topic = x.deeptopic.pop();
                    x.deeptopic = undefined;
                    x.topicname = x.topic && x.topic.displayname;

                    if (x.featuredimage) {
                        x.imageurl = x.featuredimage.sizes.thumbnaillarge.url;
                    }
                });
                send(arr);
            });
        }, {_id : 1});
    }

    livevar(cli, levels, params, send) {
        const conditions = {};
        if (!cli.hasRight('editor')) {
            conditions.author = db.mongoID(cli.userdata.userid);
        }

        this.queryList(cli._c, db.mongoID(params.topic), params.q, {
            conditions, 
            max : params.max,
            page : params.page
        }, (posts) => {
            send(posts);
        });
    }
}

module.exports = new ContentSearch();
