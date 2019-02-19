const slib = require('../lib/search');

class ContentSearch {
    livevar(cli, levels, params, send) {
        if (levels[0] == "dashboard") {
            slib.generateReport({
                siteid : cli._c.id,
                grouped : true,
                groupGetContent : true,
                max : 20,
                oldest : Date.now() - (1000 * 60 * 60 * 24 * 7)
            }, (arr) => {
                send(arr.reverse());                  
            });
        } else if (levels[0] == "lys") {
            slib.lysSearch(cli, params.text, res => send(res));
        } else {
            const conditions = {};
            if (!cli.hasRight('editor')) {
                conditions.author = db.mongoID(cli.userdata.userid);
            }

            slib.queryList(cli._c, db.mongoID(params.topic), params.q, {
                conditions, 
                max : params.max,
                page : params.page,
                scoresort : params.scoresort
            }, (posts) => {
                send(posts);
            });
        }
    }
}

module.exports = new ContentSearch();
