const db = require('./db.js');
const filelogic = require('../pipeline/filelogic');
const networkinfo = require('../network/info.js');
const pathlib = require('path');
const hooks = require('./hooks');

class StyledPagesLib {
    sendTable(cli, levels, params, send) {
        let response = {size : 0, data : [], code : 204};
        let filter = {status : {$ne : "destroyed"}};

        if (params.filters.status) {
            filter.status = params.filters.status;
        }

        if (params.search) {
            filter.title = new RegExp(params.search, 'gi');
        }

        db.count(cli._c, 'styledpages', filter, (err, total) => {
            db.findToArray(cli._c, 'styledpages', filter, (err, arr) => {
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


    generateFileName(conf, page) {
        let landingPath = page.slug + (page.status == "magiclink" ? page.magiclink : "") + (page.staticfile ? "" : ".html");
        return landingPath;
    }

    generatePage(conf, page, done) {
        let landingPath = this.generateFileName(conf, page);
        const extra = {
            config : conf, 
            page : page
        };

        if (page.skiplayout) {
            filelogic.dumpToFile(pathlib.join(conf.server.html, landingPath), page.content, done, 'utf8');
        } else {
            filelogic.renderThemeLML3(conf, 'styledpage', landingPath, extra, done);
        }
    }

    sendPage(cli, page) {
        let landingPath = this.generateFileName(cli._c, page);
        let go = () => {
            filelogic.pipeFileToClient(cli, cli._c.server.html + "/" + landingPath, () => {}, true);
        };

        filelogic.fileExists(landingPath, (exists) => {
            if (!exists) {
                this.generatePage(cli._c, page, () => {
                    go();
                });
            } else {
                go();
            }
        });
    }

    maybeSendPage(cli, page) {
        if (page.status == "public" || (page.status == "magiclink" && cli.routeinfo.params.accesskey == page.magiclink)) {
            this.sendPage(cli, page);
            return true;
        }

        return false;
    }

    serveOrFallback(cli, fallback) {
        let slug = cli.routeinfo.path[0];
        db.findUnique(cli._c, 'styledpages', { slug }, (err, page) => { 
            if (err || !page) {
                fallback();
            } else {
                this.maybeSendPage(cli, page) || fallback();
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

            var cachedFile = this.generateFileName(conf, page);
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


}

module.exports = new StyledPagesLib();
