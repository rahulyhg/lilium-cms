const filelogic = require('./filelogic');
const fs = require('fs');
const sharedcache = require("../lib/sharedcache.js");
const styledpages = require('../lib/styledpages.js');
const editions = require('../controllers/editions');
const _conf = require('../lib/config');
const articleLib = require('../lib/content.js');
const db = require('../lib/db');
const noop = () => {};


const MIMES = {
    "":"text/html",
    ".html":"text/html",
    ".htm":"text/html",
    ".css":"text/css",
    ".js":"text/javascript",
    ".png":"image/png",
    ".jpg":"image/jpeg",
    ".jpeg":"image/jpeg",
    ".bmp":"image/bmp",
    ".gif":"image/gif",
    ".swf":"application/x-shockwave-flash",
    ".lml":"application/x-lilium-markup",
    ".svg":"image/svg+xml",
    ".xml":"text/xml; charset=utf-8"
}

class BotResponder {
    isBot(useragent = "") {
        return useragent.includes("Googlebot") || useragent.includes("bingbot") || 
               useragent.includes("comscore")  || useragent.includes("SemrushBot") ||
               useragent.includes("DotBot");
    }

    handle(cli) {
        log('BotResponder', 'Responding to not found bot request', 'info');
        const authorPathIndex = cli.routeinfo.path.indexOf("author")
        if (authorPathIndex != -1) {
            const permalink = "/author/" + cli.routeinfo.path[authorPathIndex + 1];
            log('BotResponder', 'Redirected to ' + permalink, 'info');
            return cli.redirect(permalink, true);
        }

        const maybeslug = cli.routeinfo.path.find(x => x.length > 30);

        db.findUnique(cli._c, 'content', {
            $or : [
                { name : maybeslug },
                { aliases : maybeslug }
            ],
            status : "published"
        }, (err, article) => {
            if (article) {
                const permalink = article.url; 
                log('BotResponder', 'Redirected to ' + permalink, 'info');
                return cli.redirect(permalink, true);
            } else {
                log('BotResponder', 'Could not redirect bot request from ' + cli.routeinfo.fullpath, 'warn');
                cli.throwHTTP(404, undefined, true);
            }
        });
    }
}

class HTMLServer {
    constructor() {
        this.botresponder = new BotResponder();
    }

    serveStatic(cli) {
		cli.touch('htmlserver.serveStatic');
		cli.routeinfo.mimetype = this.mimeOrRefused(cli.routeinfo.fileExt);

        const filepath = cli._c.server.html + cli.routeinfo.relsitepath;
        fs.stat(filepath, (err, exists) => {
            if (!err) {
                const stream = fs.createReadStream(filepath);
                stream.on('error', () => { cli.throwHTTP(404, undefined, true); });
                stream.pipe(cli.response);
            } else {
                cli.throwHTTP(404, 'Not found', true);
            }
        });
    };

	serveClient(cli) {
		cli.touch('htmlserver.serveClient');

		cli.routeinfo.mimetype = this.mimeOrRefused(cli.routeinfo.fileExt);

		let filename = cli._c.server.html + cli.routeinfo.relsitepath;
		let htmlFile = filename + ".html";

		fs.stat(htmlFile, (err, fileExists) =>{
			if (!err) {
				cli.routeinfo.isStatic = true;
                fs.readFile(htmlFile, { encoding : 'utf8' }, (err, ctn) => {
					cli.touch('htmlserver.serveClient.callback');
                    cli.sendHTML(ctn);
				});
			} else {
				fs.stat(filename, (err, fileExists) =>{
					if (!err) {
						// If html page requested from root
						if (cli.routeinfo.path.length == 1 && cli.routeinfo.relsitepath.indexOf('.html') !== -1) {
							cli.redirect(cli._c.server.url + cli.routeinfo.fullpath.slice(-5), true);
						} else {
                            fs.readFile(filename, { encoding : 'utf8' }, (err, ctn) => {
                                cli.response.end(ctn);
								cli.touch('htmlserver.serveClient.callback');
							});
						}
					} else {
                        styledpages.serveOrFallback(cli, () => {
                            log('HTMLServer', "Styledpages fellback", 'details');

                            editions.serveOrFallback(cli, () => {
                                log('HTMLServer', "Editions fellback", 'details');

                                const name = cli.routeinfo.path[cli.routeinfo.path.length - 1];
                                let pageIndex = -1;
                                if (!isNaN(name)) {
                                    pageIndex = parseInt(name);
                                    name = cli.routeinfo.path[cli.routeinfo.path.length - 2];
                                }

                                articleLib.generateOrFallback(cli, name, (success, redirection) => {
                                    if (success) {
                                        if (redirection) {
                                            log('HTMLServer', 'Article generated with redirection from cli', 'details');
                                            cli.redirect(redirection);
                                        } else {
                                            log('HTMLServer', 'Article generated from cli', 'details');
                                            cli.routeinfo.isStatic = true;
                                            fs.readFile(filename + '.html', { encoding : 'utf8' }, (err, markup) => {
                                                cli.sendHTML(markup);
                                                cli.touch('htmlserver.serveClient.callback');
                                            });
                                        }
                                    } else if (that.botresponder.isBot(cli.request.headers["user-agent"])) {
                                        that.botresponder.handle(cli);
                                    } else {
                                        log('HTMLServer', '404 => ' + cli._c.server.url + cli.routeinfo.fullpath + " from " + cli.ip + " with agent " + cli.request.headers["user-agent"], 'warn');
                                        const cachekey = "404_html_" + cli._c.uid;
    
                                        sharedcache.get(cachekey, (html) => {
                                            if (html) {
                                                cli.response.writeHead(404, {"content-type" : "text/html"});
                                                cli.response.end(html);
                                            } else {
                                                filelogic.renderThemeLML(cli, '404', '404.html', {}, (content) => {
                                                    cli.response.writeHead(404, {"content-type" : "text/html"});
                                                    cli.response.end(content);
            
                                                    const setobj = {};
                                                    setobj[cachekey] = content;
                                                    sharedcache.set(setobj);
                                                });
                                            }
                                        });
                                    }
                                }, true, pageIndex)
                            });
                        });
					}
				});
			}
		});

	};

	registerMime(ext, present) {
		if (!this.mimeRegistered(ext)) {
			_conf.default().MIMES[ext] = present;
		} else {
			throw "[HTMLServer - MimeException] MIMETYPE already registered.";
		}
	};

	mimeRegistered(ext) {
		return typeof _conf.default().MIMES[ext] !== 'undefined';
	};

	mimeOrRefused(ext) {
		return MIMES[ext] || "application/x-lilium-nope";
	};
};

const that = new HTMLServer();
module.exports = that;
