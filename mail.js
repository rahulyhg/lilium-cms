const log = require('./log.js');
const fileserver = require('./fileserver.js');
const filelogic = require('./filelogic.js');
const nodemailer = require('nodemailer');
const db = require('./includes/db.js');
const LML2 = require('./lml/compiler.js');

let senderInfo = {
    default : {
        user : "",
        pass : "",
        from : "",
        handler : "gmail",
        transporter : {}
    }
};

let mailHooks = {
    to_new_user : {displayname : "New user was created. Send to new user."},
    lilium_restarted : {displayname : "Lilium restarted. Send to admins."},
    article_sent_for_review : {displayname : "An article has been sent for review. Send to production."},
    communication_on_article : {displayname : "A new communication is added to an article. Send to subscribers."},
    ticket_submitted : {displayname : "A support ticket was submitted. Send to developers."},
    ticket_status_update : {displayname : "A support ticket was updated. Send to original poster."},
    yesterday_stats_to_editor : {displayname : "It's late; generate stats of yesterday. Send to editors."}
};

class EMail {
    constructor(siteid, to, subject, content) {
        this.siteid = siteid;

        this.to = to || "";
        this.subject = subject || "";
        this.content = content || "";
        this.cc = [];

        this.files = [];
    }

    setHTML(html) {
        this.html = html;
    }

    attach(filepath) {
        this.files.push(filepath)
    }

    addCC(addr) {
        this.cc.push(addr);
    }

    setCC(ccs) {
        this.cc = ccs;
    }
};

class MailTemplate {
    constructor(initialName) {
        this.displayname = initialName || "New Email template";
        this.subject = "";
        this.hooks = "";
        this.description = "";
        this.template = "";
        this.stylesheet = "a {\n    color : #9B59B6;\n    font-weight: bold;\n}";
        this.active = true;
        this._id;
    }

    static save(_c, templateid, template, cb) {
        db.update(_c, 'mailtemplates', {_id : db.mongoID(templateid)}, template, (err) => {
            cb && cb(err);
        });
    }
}

class MailController {
    constructor() {
        require('./config.js').eachSync((conf) => {
            db.createCollection(conf, 'mailtemplates');
        });
    }

    livevar(cli, levels, params, sendback) {
        if (cli.hasRight('edit-emails')) {
            if (levels[0] == "search") {
                let $match= { deleted: { $ne: true } };
                if (params.filters.search) {
                    $match.displayname = new RegExp(params.filters.search, 'i');
                }

                if (params.filters.hook) {
                    $match.hooks = params.filter.hook;
                }

                db.join(cli._c, 'mailtemplates', [
                    {$match},
                    {$sort : {_id : -1}},
                    {$skip : params.skip || 0},
                    {$limit : params.limit || 30}
                ], (items) => {
                    sendback({ items });
                });
            } else if (levels[0] == "hooks") {
                let arr = [];
                for (var name in mailHooks) {
                    arr.push(Object.assign(mailHooks[name], {name : name}));
                }

                sendback(arr);
            } else if (levels[0] == "simple") {
                db.find(cli.c, 'mailtemplates', {active : true}, [], (err, cur) => {
                    cur.project({_id : 1, displayname : 1}).toArray((err, arr) => {
                        sendback(arr);
                    });
                });
            } else if (levels[0]) {
                db.findUnique(cli._c, 'mailtemplates', {_id : db.mongoID(levels[0]), active : true}, (err, obj) => {
                    sendback(obj);
                });
            } else {
                sendback(new Error("Undefined level " + levels[0]));
            }
        } else {
            sendback(new Error("Get outta here"));
        }
    }

    adminDELETE(cli) {
        db.update(cli._c, 'mailtemplates', { _id: db.mongoID(cli.routeinfo.path[2]) }, { hooks: '', deleted: true }, (err, r) => {
            cli.sendJSON({ updated: !!r.nModified });
        });
    }

    adminPOST(cli) {
        if (!cli.hasRight('edit-emails')) {
            return cli.throwHTTP(403);
        }

        switch (cli.routeinfo.path[2]) {
            case 'edit':
                MailTemplate.save(cli._c, cli.routeinfo.path[3], cli.postdata.data, (err) => {
                    cli.sendJSON({success : !err, error : err});
                });
                break;
            case 'new':
                db.insert(cli._c, 'mailtemplates', new MailTemplate(cli.postdata.data.displayname), (err, r) => {
                    cli.sendJSON({ success: !err, err });
                });
                break;
            default:
                cli.throwHTTP(404);
        }
    }
};

class LMLMail {
    setup() {
        this.controller = new MailController();
    }

    adminPOST(cli) {
        this.controller.adminPOST(cli);
    }

    adminDELETE(cli) {
        this.controller.adminDELETE(cli);
    }

    livevar(cli, levels, params, send) {
        this.controller.livevar(cli, levels, params, send);
    };

    setSender(siteid, sender) {
        if (sender && sender.user && sender.pass) {
            senderInfo[siteid] = senderInfo[siteid] || {};
            log('Mail', 'Updating sender info for website with id ' + siteid);

            for (var field in sender) {
                senderInfo[siteid][field] = sender[field];
            }

            senderInfo[siteid].transporter = nodemailer.createTransport({
                service : "gmail",
                auth : {
                    user : sender.user,
                    pass : sender.pass
                }
            });
        }
    }

    addHook(_c, hookname, displayname) {
        mailHooks[hookname] = {
            name : hookname,
            displayname : displayname
        };
    }

    // Extra must contain "to : [strings]"
    triggerHook(_c, hookname, to, extra, cb) {
        const that = this;

        log('Mail', 'Triggering email hook ' + hookname + ' for ' + to, 'detail');
        db.findToArray(_c, 'mailtemplates', { hooks : hookname }, (err, templates) => {
            for (let i = 0; i < templates.length; i++) {
                let template = templates[i];
                let lmllibs = extra.lmllibs ? ("{#"+ extra.lmllibs.join(';') +"}") : "{#config;extra;date}";
                let body = lmllibs + '<html><head><style>' + 
                    template.stylesheet + '</style></head><body>' + 
                    template.template + '</body></html>';

                extra = extra || {};
                extra.config = _c;

                LML2.compileToString(_c.id, body, extra, (compiledPage) => {
                    log('Mail', 'Preparing to send LML email to ' + to, 'info');
                    const email = that.createEmail(_c, to, template.subject);
                    email.setHTML(compiledPage);
                    if (extra.cc) {
                        email.setCC(extra.cc);
                    }

                    that.send(email, () => {
                        log('Mail', 'Sent email to ' + to + ' from hook ' + hookname, 'detail');
                        cb && cb();
                    });
                });
            }
        });
    }

    createEmail(_c, to, subject, content) {
        return new EMail(_c.id, to, subject, content);
    }

    sendGMail(email, callback) {
        const sender = senderInfo[email.siteid];
        if (sender) {
            if (!email.to || !email.subject || (!email.content && !email.html)) {
                log('Gmail', 'Could not send email due to missing fields', 'warn');
                callback && callback(new Error("Could not send email : missing fields"));
            } else {
                log('Gmail', 'Sending email from ' + senderInfo[email.siteid].user + ' to ' + email.to);
                let _c = require('./config.js').fetchConfig(email.siteid);
    
                let emailobj = {
                    from : '"' + senderInfo[email.siteid].from + '" <' + senderInfo[email.siteid].user + ">",
                    to : email.to,
                    subject : email.subject,
                    cc : email.cc
                };
    
                if (email.html) {
                    emailobj.html = email.html;
                } else {
                    emailobj.text = email.content;
                }
    
                senderInfo[email.siteid].transporter.sendMail(emailobj, (err, res) => {
                    if (err) {
                        log('Mail', 'Could not send email => ' + err, 'err');
                    } else {
                        log('Mail', 'Sent email successfully to ' + email.to, 'success');
                    }
    
                    callback && callback(err, res);
                });
            }
        } else {
            log('Mail', 'Will not attempt to send email because mail configuration could not be found', 'warn');
            callback && callback({ message: 'Email sender configuration could not be found for the site' }, undefined);            
        }
    }

    send(email, callback) {
        if (senderInfo.handler == "gmail" || !senderInfo.handler) {
            this.sendGMail(email, callback);
        } else {
            log('Email', 'Email module needs a supported handler', 'warn');
            callback && callback(new Error("No email handler provided."));
        }
    }

    settingsWillSave(pkg) {
        let conf = pkg._c;
        let newSender = {
            user : conf.emails.senderemail,
            pass : conf.emails.senderpass,
            from : conf.emails.senderfrom
        }

        this.setSender(pkg._c.id, newSender);
    }
};

module.exports = new LMLMail();
