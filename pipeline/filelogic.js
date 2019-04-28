const fs = require('fs');
const _c = require('../lib/config');
const LML2 = require('../lml/compiler.js');
const LML3 = require('../lml3/compiler.js');

const db = require('../lib/db.js');
const path = require('path');

const crypto = require('crypto');
const dateFormat = require('dateformat');
const defaultCT = 'text/html; charset=utf-8';

class FileLogic {
    renderThemeLML3 (cli, contextname, outputfilename, extra = {}, done, nolayout) {
        const themeLib = require('../lib/themes.js');
        const _c = cli._c || cli;
        const ctxName = contextname || "home";

        if (!cli.crash) {
            cli.crash = err => { throw err; };
        }   

        themeLib.fetchCurrentTheme(_c, cTheme => {
            try {
                extra.language = extra.language || _c.website.language;
                cTheme.settings = cTheme.settings || {};

                if (cTheme.settings) {
                    cTheme.settings = cTheme.settings[extra.language] || cTheme.settings.en;
                }

                extra.theme = cTheme;
                extra.minify = true;
                extra.url = _c.server.url;
            } catch (err) {
                return cli.crash(err);
            }

            try {
                extra.vocab = require(_c.server.base + "flowers/" + cTheme.uName + "/vocab/" + extra.language + ".json");
            } catch (err) {}

            let readPath;
            let layoutPath;
            let saveDir;
            let savePath;

            try {
                if (cTheme.contexts[ctxName]) {
                    readPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.contexts[ctxName] || ctxName + ".lml3");
                    layoutPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.layout || "layout.lml3");
                } else {
                    readPath = _c.server.base + "flowers/" + cTheme.uName + "/lml/" + _c.env + ".lml3";
                }

                 
                saveDir = _c.server.html;
                savePath = path.join(saveDir, outputfilename);
            } catch (err) {
                return cli.crash(err);
            }

            log('FileLogic', 'Compiling theme LML3 with context ' + contextname, 'info')
            LML3.compile(_c, readPath, extra, (ctn) => {
                if (nolayout) {
                    return done(ctn);
                }

                log('FileLogic', 'Adding template to LML3 theme compilation', 'info')
                extra.contentHTML = ctn;

                const next = cdned => {
                    fs.mkdir(path.dirname(savePath), { recursive : true }, () => {
                        try {
                            log('FileLogic', 'Writing LML3 compiled file to disk => ' + savePath, 'info');
                            fs.mkdir(saveDir, { recursive : true }, () => {
                                fs.writeFile(savePath, cdned, { encoding : "utf8" }, err => {
                                    if (err) {
                                        return cli.crash(err);
                                    }
                                    log('FileLogic', 'LML3 compiled file was written to disk', 'success');
                                    done(cdned);
                                });
                            });
                        } catch (err) {
                            return cli.crash(err);
                        }
                    }, false);
                }

                if (layoutPath && !cTheme.nolayout) {
                    LML3.compile(_c, layoutPath, extra, (fHtml) => {
                        require('../lib/cdn.js').parse(fHtml, _c, cdned => {
                            next(cdned);
                        });
                    });
                } else {
                    next(ctn);
                }
            });
        });
    };

    renderThemeLML (cli, ctxName, preferredFileName, extra = {}, callback, skipLayout) {
        const theme = require('../lib/themes.js');
        const _c = cli._c || cli;

        extra.config = _c;
        extra.contextname = ctxName;
        extra.siteid = _c.id;

        theme.fetchCurrentTheme(_c, cTheme => {
            if (cTheme && cTheme.layout && cTheme.layout.charAt(cTheme.layout.length-1) == "3") {
              return this.renderThemeLML3(...arguments)
            }

            if (!extra.language) {
                extra.language = _c.website.language;
            }

            extra.theme = cTheme;
            extra.minify = true;
            extra.vocab = require(_c.server.base + "flowers/" + cTheme.uName + "/vocab/" + extra.language + ".json");

            const readPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.contexts[ctxName] || ctxName + ".lml");
            const savePath = preferredFileName[0] == "/" ? preferredFileName : (_c.server.html + "/" + preferredFileName);
            let tmpPath = _c.server.html + "/static/tmp/" + (Math.random()).toString().substring(2) + ".themetmp";
            let layoutPath = _c.server.base + "flowers/" + cTheme.uName + "/" + (cTheme.layout || "layout.lml");

            if (skipLayout) {
                tmpPath = savePath;
            }

            if (extra.topic && extra.topic.override) {
                extra.theme.settings = Object.assign(extra.theme.settings || {}, extra.topic.override || {});
            }

            log('FileLogic', 'Compiling context theme page', 'info');
            fs.readFile(readPath, { encoding : 'utf8' }, lml => {
                extra.rootDir = readPath.substring(0, readPath.lastIndexOf('/'));
                LML2.compileToString(
                    extra.siteid,
                    lml,
                    extra,
                    ctn => {
                        log('FileLogic', 'Including compiled theme page to layout', 'detail');
                        extra.contentHTML = ctn;

                        if (skipLayout) {
                            return require('../lib/cdn.js').parse(ctn, _c, cdned => {
                                fs.mkdir(savePath, { encoding : 'utf8' }, () => {
                                    fs.writeFile(savePath, cdned, { encoding : 'utf8', flags : 'w+' }, () => {
                                        callback(cdned);
                                    });
                                });
                            });
                        }

                        extra.rootDir = layoutPath.substring(0, layoutPath.lastIndexOf('/'));
                        fs.readFile(layoutPath, { encoding : 'utf8' }, layoutLML => {
                            LML2.compileToString(
                                extra.siteid,
                                layoutLML,
                                extra,
                                fHtml => {
                                    log('FileLogic', 'Completed Theme page compilation', 'success');
                                    require('../lib/cdn.js').parse(fHtml, _c, cdned => {
                                        log("FileLogic", "Minifier and CDN called back to Filelogic", 'detail');

                                        fs.mkdir(savePath, { encoding : 'utf8' }, () => {
                                            fs.writeFile(savePath, cdned, { encoding : 'utf8', flags : 'w+' }, () => {
                                                callback(cdned);
                                            });
                                        }, false);
                                    });

                                    fs.unlink(tmpPath, () => {});
                                }
                            );
                        }, false, 'utf8');
                    }
                );
            }, false, 'utf8');
        });
    };

    genRandomNameFile  (filename, prefix) {
        filename = crypto.randomBytes(10).toString('hex') + 
            filename + dateFormat(new Date(), "isoDateTime") + 
            crypto.randomBytes(10).toString('hex');

        return (prefix || "") + crypto.createHash('sha1').update(filename).digest('hex');
    }
};

module.exports = new FileLogic();
