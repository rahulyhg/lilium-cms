const filelogic = require('./filelogic');
const contentlib = require('./content');
const db = require('./includes/db');

class ContentController {
    adminGET(cli) {
        // Get LML3 markup
        switch (cli.routeinfo.path[2]) {
            case "list" : cli.hasRightOrRefuse('list-articles') && filelogic.serveAdminLML3(cli); break;
            case "write" : cli.hasRightOrRefuse('create-articles') && filelogic.serveAdminLML3(cli, true); break;
            default : cli.refuse();
        }
    }

    adminPOST(cli) {
        // Create new post
        switch (cli.routeinfo.path[2]) {
            case "new" : cli.hasRightOrRefuse('create-articles') 
                && cli.postdata.data.headline
                && contentlib.create(cli._c, cli.postdata.data.headline, db.mongoID(cli.userinfo.userid), (err, art) => {
                    cli.sendJSON(err ? { error : err } : { _id : art._id });
                }); break;
            default : cli.refuse();
        }
    }

    adminPUT(cli) {
        // Update new post, publish
        const _id = db.mongoID(cli.routeinfo.path[3]);
        if (!_id) {
            return cli.throwHTTP(404, undefined, true);
        }

        switch (cli.routeinfo.path[2]) {
            case 'save':
                log('Content', 'Received PUT request under /save', 'detail');
                db.findUnique(cli._c, 'content', { _id }, (err, article) => {
                    if (article && (cli.hasRight('editor') || !article.author || cli.userinfo.userid == article.author.toString())) {
                        cli.readPostData(data => data ? contentlib.update(cli._c, _id, db.mongoID(cli.userinfo.userid), data, (err, historyentry) => cli.sendJSON({
                            err, historyentry
                        })) : cli.throwHTTP(404, undefined, true));
                    } else {
                        log('Content', 'User ' + cli.userinfo.displayname + ' was not authorized to edit article with id ' + _id, 'warn');
                        cli.throwHTTP(404, undefined, true);
                    }
                }, { author : 1 });
                break;


        }
    }

    adminDELETE(cli) {
        // Unpublish, destroy
        
    }

    livevar(cli, levels, params, sendback) {
        // Get formatted data
        if (levels[0] == "bunch") {
            contentlib.bunch(cli._c, params.filters, params.filters && params.filters.sort, params.max, (params.page - 1) * params.max, sendback);
        } else if (levels[0] == "write") {
            contentlib.getFull(cli._c, levels[1], post => sendback(post));
        } else if (levels[0] == "history") {
            contentlib.getHistoryList(cli._c, levels[1], list => sendback(list));
        } else {
            sendback([]);
        }
    }
};

module.exports = new ContentController();
