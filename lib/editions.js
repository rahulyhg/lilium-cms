const db = require('./db');

module.exports.updatePostsAfterMerge = (_c, then, now, done) => {
    let ctn = 0;
    const processOnePost = cur => {
        cur.next((err, post) => {
            if (!post) {
                log("Editions", "Updated " + ctn + " posts after merging", "success");
                return done({ postupdated : ctn });
            }

            ctn++;
            post.editions[then.level] = now._id;
            db.update(_c, 'content', { _id : post._id }, { editions : post.editions }, () => setImmediate(() => processOnePost(cur)));
        });
    }

    db.find(_c, 'content', { editions : then._id }, [], (err, cur) => processOnePost(cur));
}

module.exports.fieldToRef = (field, value) => {
    return field == "icon" || field == "featuredimage" ? db.mongoID(value) : value;
}

module.exports.getFull = (_id, sendback) => {
    db.findUnique(cli._c, 'editions', { _id }, (err, ed) => {
        sendback(ed);
    });
}
