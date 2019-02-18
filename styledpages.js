const db = require('./includes/db.js');
const filelogic = require('./pipeline/filelogic');
const networkinfo = require('./network/info.js');
const hooks = require('./hooks');

class StyledPages {
    constructor() {

    }

    generateFileName(conf, page) {
        let landingPath = conf.server.html + "/" + page.slug + (page.status == "magiclink" ? page.magiclink : "") + (page.staticfile ? "" : ".html");
        return landingPath;
    }

    generatePage(conf, page, done) {
        let landingPath = that.generateFileName(conf, page);
        const extra = {
            config : conf, 
            page : page
        };

        if (page.skiplayout) {
            filelogic.dumpToFile(landingPath, page.content, done, 'utf8');
        } else {
            filelogic.renderThemeLML(conf, 'styledpage', landingPath, extra, done);
        }
    }

    sendPage(cli, page) {
        let landingPath = that.generateFileName(cli._c, page);
        let go = () => {
            filelogic.pipeFileToClient(cli, landingPath, () => {}, true);
        };

        filelogic.fileExists(landingPath, function(exists) {
            if (!exists) {
                that.generatePage(cli._c, page, () => {
                    go();
                });
            } else {
                go();
            }
        });
    }

    maybeSendPage(cli, page) {
        if (page.status == "public" || page.status == "magiclink" && cli.routeinfo.params.accesskey == page.magiclink) {
            that.sendPage(cli, page);
            return true;
        }

        return false;
    }

    serveOrFallback(cli, fallback) {
        let slug = cli.routeinfo.path[cli.routeinfo.path.length-1];
        db.findUnique(cli._c, 'styledpages', {slug : slug}, function(err, page) { 
            if (err || !page) {
                fallback();
            } else {
                that.maybeSendPage(cli, page) || fallback();
            }
        });
    }

    createNewObject(title, description, slug) {
        return {
            title : title || "New Styled Page",
            description : description || "",
            content : "",
            slug : slug || "page-" + Math.random().toString().substring(3),
            status : "invisible",
            customcss : "body {}",
            customjs : "console.log('Loaded styled page.');",
            magiclink : Math.random().toString().substring(3) + Math.random().toString().substring(3)
        };
    }

    save(conf, pageID, newData, done) {
        db.findUnique(conf, 'styledpages', {_id : db.mongoID(pageID)}, (err, page) => {
            if (err || !page) { return done(err); }

            var cachedFile = that.generateFileName(conf, page);
            filelogic.deleteFile(cachedFile, () => {
                db.update(conf, 'styledpages', {_id : db.mongoID(pageID)}, newData, () => {
                    db.findUnique(conf, 'styledpages', {_id : db.mongoID(pageID)}, (err, newpage) => {
                        hooks.fireSite(conf, 'styledpageSaved', {page : newpage});
                        this.generatePage(conf, newpage, () => {
                            done && done(undefined, true);
                        });
                    });
                });
            });
        });
    }

    apiGET(cli) {
        db.findUnique(cli._c, 'styledpages', { slug : cli.routeinfo.path[2], status : "public" }, (err, page) => {
            page ? cli.sendJSON({
                title : page.title,
                content : page.content,
                css : page.customcss,
                js : page.customjs
            }) : cli.throwHTTP(404, 'No such page', true);
        });
    }

    adminPOST(cli) {
        if (!cli.hasRight("styledpages")) { return cli.refuse(); }

        const level = cli.routeinfo.path[2];
        switch (level) {
            case "edit":
                that.save(cli._c, cli.routeinfo.path[3], cli.postdata.data, (err, success) => {
                    cli.sendJSON({err : err, success : success});
                });

                break;
            case "new":
                const newStyledPage = that.createNewObject(cli.postdata.data.title, cli.postdata.data.description, cli.postdata.data.slug);
                db.insert(cli._c, 'styledpages', newStyledPage, (err, r) => {
                        hooks.fireSite(cli._c, 'styledpageCreated', {_id : r.insertedId});
                        cli.sendJSON({ created: newStyledPage });
                        log('StyledPages', 'Created new styledpage', 'success');
                    }
                );

                break;
            default:
                cli.throwHTTP(501, 'Method not implemented', true);
        }
    }

    adminDELETE(cli) {
        if (!cli.hasRight("styledpages")) { return cli.refuse(); }
        
        db.update(cli._c, 'styledpages', { _id: db.mongoID(cli.routeinfo.path[2]) }, { deleted: true }, err => {
            if (!err) {
                log('StyledPages', 'Styledpage with id ' + cli.routeinfo.path[2] + ' removed by user ' + cli.userinfo.user, 'warn');
                cli.sendJSON({ success: true });
            } else {
                cli.throwHTTP(500, 'Could not remove styled page', true);
            }
        }, true);
    }

    sendTable(cli, levels, params, send) {
        let response = {size : 0, data : [], code : 204};
        let filter = {status : {$ne : "destroyed"}};

        if (params.filters.status) {
            filter.status = params.filters.status;
        }

        if (params.search) {
            filter.title = new RegExp(params.search, 'gi');
        }

        db.count(cli._c, 'styledpages', filter, function(err, total) {
            db.findToArray(cli._c, 'styledpages', filter, function(err, arr) {
                for (let i = 0; i < arr.length; i++) {
                    arr[i].editlink = cli._c.server.url + "/admin/styledpages/edit/" + arr[i]._id;
                    arr[i].title = arr[i].title || "[No title]";
                }

                response.size = total;
                response.data = arr;
                response.code = 200;

                send(response);
            }, {
                title : 1, status : 1
            }, params.skip || 0, params.max || 20);
        });
    }

    getSingle(_c, id, cb) {
        db.findUnique(_c, 'styledpages', {_id : db.mongoID(id)}, (err, obj) => {
            cb(obj);
        });
    }

    search(cli, levels, params, send) {
        const filters = params.filters;
        const $match = { deleted: { $ne: true } };
        if (filters.status) {
            $match.status = filters.status;
        }

        if (filters.search) {
            $match.title = new RegExp(filters.search, 'gi');
        }

        db.join(cli._c, 'styledpages', [
            { $match },
            { $sort : {_id: -1} }
        ], arr => {
            send({ items : arr, total : arr.length })
        });
    }

    livevar(cli, levels, params, send) {
        if (!cli.hasRight("styledpages")) { return send(); }

        switch (levels[0]) {
            case 'search': that.search(cli, levels, params, send); break;
            case 'table': that.sendTable(cli, levels, params, send); break;
            case 'get'  : that.getSingle(cli._c, levels[1], send); break;
            default: send([]);
        }
    }

    setup() {
        if (networkinfo.isElderChild()) {
            require("./config.js").eachSync((site) => {
                db.findToArray(site, 'styledpages', {staticfile : true}, (err, arr) => {
                    arr.forEach(p => this.generatePage(site, p, () => {}));
                });
            });
        }
    }
};

const that = new StyledPages();
module.exports = that;
