const filelogic = require('./filelogic');
const contentlib = require('./content');
const hooks = require('./hooks');
const db = require('./includes/db');

class ContentController {
    GET(cli) {
        switch (cli.routeinfo.path[1]) {
            case "preview" : contentlib.getPreview(cli._c, db.mongoID(cli.routeinfo.path[2]), cli.routeinfo.path[3], (err, markup) => err ? cli.throwHTTP(err, undefined, true) : cli.sendHTML(markup)); break;
            default : cli.refuse();
        }        
    }

    adminGET(cli) {
        // Get LML3 markup
        switch (cli.routeinfo.path[2]) {
            case "list" : cli.hasRightOrRefuse('list-articles') && filelogic.serveAdminLML3(cli); break;
            case "write" : cli.hasRightOrRefuse('create-articles') && filelogic.serveAdminLML3(cli, true); break;
            case "wizard" : cli.hasRightOrRefuse('create-articles') && filelogic.serveAdminLML3(cli, true); break;
            case "report": contentlib.generatePublicationReport(cli._c, db.mongoID(cli.routeinfo.path[3]), report => cli.sendJSON(report)); break;
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
                }); 
                break;
            case "auto":
                cli.hasRightOrRefuse('create-articles') && db.findUnique(cli._c, 'content', { _id : db.mongoID(cli.routeinfo.path[3]) }, (err, article) => {
                    if (article && (cli.hasRight('editor') || article.author.toString() == cli.userinfo.userid)) {
                        contentlib.autosave(cli._c, db.mongoID(cli.routeinfo.path[3]),  cli.postdata.data, resp => {
                            cli.sendJSON(resp)
                        });
                    } else {
                        cli.throwHTTP(400, undefined, true);
                    }
                }, { author : 1 });
                break;
            case "debug":
                contentlib.facebookDebug(cli._c, db.mongoID(cli.userinfo.userid), db.mongoID(cli.routeinfo.path[3]), () => {
                    cli.sendJSON({ debug : 1 });
                });
                break;
            case "preview" : 
                contentlib.getPreview(cli._c, db.mongoID(cli.routeinfo.path[3]), cli.postdata.data, markup => cli.sendHTML(markup));
                break;

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
            case 'validate':
                log('Content', 'Validating article from PUT under /validate', 'detail');
                contentlib.validate(cli._c, _id, db.mongoID(cli.userinfo.userid), err => {
                    if (err) {
                        log('Content', 'Article failed validation', 'info');
                        cli.throwHTTP(err.code, err.error, true);
                    } else {
                        log('Content', 'Article was validated successfully', 'success');
                        cli.sendJSON({ valid : true });
                    }
                })
                break;
            case 'publish':
                log('Content', 'Publishing from PUT under /publish', 'detail');
                contentlib.publish(cli._c, _id, db.mongoID(cli.userinfo.userid), resp => {
                    if (resp.error) {
                        cli.throwHTTP(resp.code, resp.error, true);
                    } else {
                        contentlib.facebookDebug(cli._c, db.mongoID(cli.userinfo.userid), _id, () => { });

                        cli.sendJSON(resp);
                    }
                });
                break;

            case "slug":
                log('Content', 'Updating slug from PUT under /slug', 'detail');
                db.findUnique(cli._c, 'content', { _id }, (err, article) => {
                    if (article && (cli.hasRight('editor') || !article.author || cli.userinfo.userid == article.author.toString())) {
                        cli.readPostData(data => {
                            if (data && data.slug) {
                                contentlib.editSlug(cli._c, _id, db.mongoID(cli.userinfo.userid), data.slug, (err, url) => 
                                    cli.sendJSON({ url, err })
                                );
                            } else {
                                cli.sendJSON({ err : { message : "Missing information in PUT request", type : "request" } })
                            }
                        });
                    } else {
                        log('Content', 'User ' + cli.userinfo.displayname + ' was not authorized to edit article with id ' + _id, 'warn');
                        cli.throwHTTP(404, undefined, true);
                    }
                });
                break;

            case 'submit':
                log('Content', 'Sending article for review from PUT under /submit', 'detail');
                const cid = cli.routeinfo.path[3];
                const conds = {
                    _id : db.mongoID(cid),
                    status : { $ne : "published" },
                    author : db.mongoID(cli.userinfo.userid)
                };

                db.findUnique(cli._c, 'content', conds, (err, maybePost) => {
                    if ((cli.hasRight("contributor") || cli.hasRight('contractor')) && maybePost) {
                        contentlib.sendForReview(cli._c, conds._id, conds.author, resp => cli.sendJSON(resp));
                    } else {
                        cli.sendJSON({ error : "Not allowed" });
                    }
                });
                break;

            case "refuse":
                log('Content', 'Refusing submission from PUT under /refuse', 'detail');
                if (cli.hasRight('editor')) {
                    const postid = db.mongoID(cli.routeinfo.path[3]);
                    db.findUnique(cli._c, 'content', {_id : postid}, (err, maybePost) => {
                        if (maybePost) {
                            contentlib.refuseSubmission(cli._c, postid, db.mongoID(cli.userinfo.userid), resp => cli.sendJSON(resp));
                        } else {
                            cli.sendJSON({ error : "Not allowed" })
                        }
                    });     
                } else {
                    cli.sendJSON({ error : "Not allowed" })
                }
                break;

            case 'refresh':
                log('Content', 'Refreshing article from PUT under /refresh', 'detail');
                db.findUnique(cli._c, 'content', { _id }, (err, article) => {
                    if (article && (cli.hasRight('editor') || !article.author || cli.userinfo.userid == article.author.toString())) {
                        contentlib.getFull(cli._c, _id, fullpost => {
                            contentlib.refreshURL(cli._c, fullpost, db.mongoID(cli.userinfo.userid), (historyentry, newstate) => {
                                contentlib.generate(cli._c, fullpost, () => {
                                    contentlib.facebookDebug(cli._c, db.mongoID(cli.userinfo.userid), _id, () => { });
                                    cli.sendJSON({ ok : 1, historyentry, newstate });

                                    hooks.fire('article_updated', {
                                        cli: cli,
                                        article: article,
                                        _c : cli._c
                                    });
                                }, 'all');
                            });
                        });
                    } else {
                        log('Content', 'User ' + cli.userinfo.displayname + ' was not authorized to edit article with id ' + _id, 'warn');
                        cli.throwHTTP(404, undefined, true);
                    }
                });
                break;
            default:
                cli.throwHTTP(404, undefined, true);
        }
    }

    adminDELETE(cli) {
        // Unpublish, destroy
        const _id = db.mongoID(cli.routeinfo.path[3]);
        if (!_id) {
            return cli.throwHTTP(404, undefined, true);
        }

        switch (cli.routeinfo.path[2]) {
            case 'unpublish':
            case 'destroy' :
                log('Content', 'Received DELETE request under /' + cli.routeinfo.path[2], 'detail');
                db.findUnique(cli._c, 'content', { _id }, (err, article) => {
                    if (article && (cli.hasRight('editor') || !article.author || cli.userinfo.userid == article.author.toString())) {
                        contentlib[cli.routeinfo.path[2]](cli._c, _id, db.mongoID(cli.userinfo.userid), payload => cli.sendJSON(payload));
                        hooks.fire('article_unpublished', {
                            cli: cli,
                            article: article,
                            _c : cli._c
                        });
                    } else {
                        log('Content', 'User ' + cli.userinfo.displayname + ' was not authorized to edit article with id ' + _id, 'warn');
                        cli.throwHTTP(404, "Missing rights", true);
                    }
                });
                break;

            case 'previewlink':
                db.findUnique(cli._c, 'content', { _id }, (err, article) => {
                    if (article && (cli.hasRight('editor') || !article.author || cli.userinfo.userid == article.author.toString())) {
                        const previewkey = Math.random().toString(32).substring(2);
                        db.update(cli._c, 'content', { _id}, { previewkey }, () => {
                            cli.sendJSON({ previewkey });
                        });
                    } else {
                        log('Content', 'User ' + cli.userinfo.displayname + ' was not authorized to edit article with id ' + _id, 'warn');
                        cli.throwHTTP(404, "Missing rights", true);
                    }
                });
                break;

            default:
                cli.throwHTTP(404, undefined, true);

       }
    }

    livevar(cli, levels, params, sendback) {
        // Get formatted data
        if (levels[0] == "bunch") {
            if (!cli.hasRight('editor')) {
                params.filters = params.filters || {};
                params.filters.author = cli.userinfo.userid;
            }

            contentlib.bunch(cli._c, params.filters, params.filters && params.filters.sort, params.max, (params.page - 1) * params.max, sendback);
        } else if (levels[0] == "biglist") {
            if (!cli.hasRight('editor')) {
                params.filters = params.filters || {};
                params.filters.author = db.mongoID(cli.userinfo.userid);
            }

            contentlib.bunch(cli._c, params.filters, params.filters && params.filters.sort, params.limit, params.skip, sendback);
        } else if (levels[0] == "pastpublished") {
            contentlib.getPastPublished(cli._c, params, stats => sendback(stats));
        } else if (levels[0] == "write") {
            contentlib.getFull(cli._c, levels[1], post => sendback(post));
        } else if (levels[0] == "auto") {
            contentlib.getLatestAutosave(cli._c, db.mongoID(levels[1]), entry => sendback(entry || { none : true })); 
        } else if (levels[0] == "history") {
            contentlib.getHistoryList(cli._c, levels[1], list => sendback(list));
        } else if (levels[0] == "patch") {
            contentlib.getPatch(cli._c, levels[1], patch => sendback(patch));
        } else if (levels[0] == "report") {
            contentlib.generatePublicationReport(cli._c, db.mongoID(levels[1]), report => sendback(report));
        } else if (levels[0] == "bulkstats") {
            contentlib.generateBulkStats(cli._c, levels[1], params, stats => sendback(stats));
        } else {
            sendback([]);
        }
    }
};

module.exports = new ContentController();
