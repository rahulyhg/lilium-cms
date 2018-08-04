const log = require('./log.js');
const db = require('./includes/db.js');
const Admin = require('./backend/admin.js');
const fileserver = require('./fileserver.js');
const filelogic = require('./filelogic.js');
const livevars = require('./livevars.js');
const themes = require('./themes.js');
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
            fileserver.dumpToFile(landingPath, page.content, done, 'utf8');
        } else {
            filelogic.renderThemeLML(conf, 'styledpage', landingPath, extra, done);
        }
    }

    sendPage(cli, page) {
        let landingPath = that.generateFileName(cli._c, page);
        let go = () => {
            fileserver.pipeFileToClient(cli, landingPath, () => {}, true);
        };

        fileserver.fileExists(landingPath, function(exists) {
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
        
    createNewObject() {
        return {
            title : "New Styled Page",
            description : "",
            content : "",
            slug : "page-" + Math.random().toString().substring(3),
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
            fileserver.deleteFile(cachedFile, () => {
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

    adminGET(cli) {
        if (!cli.hasRight("styledpages")) { return cli.refuse(); }

        const level = cli.routeinfo.path[2];
        switch (level) {
            case "new":
                db.insert(cli._c, 'styledpages', that.createNewObject(), (err, r) => {
                    hooks.fireSite(cli._c, 'styledpageCreated', {_id : r.insertedId});
                    cli.sendJSON({
                        _id : r.insertedId.toString()
                    });
                });
                break;

            case "list":
                require('./filelogic.js').serveAdminLML3(cli);
                break;

            case "edit":
                require('./filelogic.js').serveAdminLML(cli, true);
                break;

            case undefined:
            default :
                cli.redirect(cli._c.server.url + "/admin/styledpages/list");
        }
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
            default:
                cli.throwHTTP(501, 'Method not implemented', true);
        }
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

    sendBunch(cli, levels, params, send) {
        const filters = params.filters;
        const $match = {};
        if (filters.visibility) {
            $match.status = filters.visibility;
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
            case 'bunch': that.sendBunch(cli, levels, params, send); break;
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
