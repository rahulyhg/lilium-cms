const log = require('./log.js');
const google = require('googleapis');
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
    communication_on_article : {displayname : "A new communication is added to an article. Send to subscribers."}
};

class EMail {
    constructor(siteid, to, subject, content) {
        this.siteid = siteid;

        this.to = to || "";
        this.subject = subject || "";
        this.content = content || "";

        this.files = [];
    }

    setHTML(html) {
        this.html = html;
    }

    attach(filepath) {
        this.files.push(filepath)
    }
};

class MailTemplate {
    constructor() {
        this.displayname = "New Email template";
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

        this.createForm();
    }

    createForm() {
        require('./formBuilder.js').createForm('mailtemplate_edit', {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                'id': 'article_new',
                'inner': true
            },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add('displayname', 'text', {
            displayname : "Template name"
        })
        .add('subject', 'text', {
            displayname : "Subject"
        })
        .add('template', 'ckeditor', {
            nolabel : true
        })
        .add('description', 'text', {
            displayname : "Short description"
        })
        .add('stylesheet', 'textarea', {
            displayname : "Stylesheet",
            rows : 10
        })
        .add('hooks', 'liveselect', {
            endpoint: 'mailtemplates.hooks',
            select : {
                value : 'name',
                displayname : 'displayname'
            },
            empty : {
                displayname : "No automation"
            },
            displayname: "Automatically send when"
        })
        .add('publish-set', 'buttonset', { buttons : [{
                'name' : 'save',
                'displayname': 'Save',
                'type' : 'button',
                'classes': ['btn', 'btn-default', 'btn-save']
            }
        ]});
    }

    handleLivevar(cli, levels, params, send) {
        if (cli.hasRight('edit-emails')) {
            if (levels[0] == "all") {
                db.findToArray(cli._c, 'mailtemplates', {active : true}, (err, arr) => {
                    send(arr);
                });
            } else if (levels[0] == "hooks") {
                let arr = [];
                for (var name in mailHooks) {
                    arr.push(Object.assign(mailHooks[name], {name : name}));
                }

                send(arr);
            } else if (levels[0] == "simple") {
                db.find(cli.c, 'mailtemplates', {active : true}, [], (err, cur) => {
                    cur.project({_id : 1, displayname : 1}).toArray((err, arr) => {
                        send(arr);
                    });
                });
            } else if (levels[0]) {
                db.findUnique(cli._c, 'mailtemplates', {_id : db.mongoID(levels[0]), active : true}, (err, obj) => {
                    send(obj);
                });
            } else {
                send(new Error("Undefined level " + levels[0]));
            }
        } else {
            send(new Error("Get outta here"));
        }
    }

    handleGET(cli) {
        if (!cli.hasRight('edit-emails')) {
            return cli.throwHTTP(403);
        }

        switch (cli.routeinfo.path[2]) {
            case undefined:
            case "list":
                filelogic.serveAdminLML(cli);
                break;

            case "edit":
                filelogic.serveAdminLML(cli, true);
                break;

            case 'new':
                db.insert(cli._c, 'mailtemplates', new MailTemplate(), (err, r) => {
                    cli.redirect(cli._c.server.url + "/admin/mailtemplates/edit/" + r.insertedId.toString(), false, 'rewrite');
                });
                break;

            default:
                cli.throwHTTP(404);
        }
    }

    handlePOST(cli) {
        if (!cli.hasRight('edit-emails')) {
            return cli.throwHTTP(403);
        }

        switch (cli.routeinfo.path[2]) {
            case 'edit':
                MailTemplate.save(cli._c, cli.routeinfo.path[3], cli.postdata.data, (err) => {
                    cli.sendJSON({success : !err, error : err});
                });
                break;

            default:
                cli.throwHTTP(404);
        }
    }

    bind() {
        require('./livevars.js').registerLiveVariable('mailtemplates', this.handleLivevar);
        require('./backend/admin.js').registerAdminEndpoint('mailtemplates', 'GET', this.handleGET);
        require('./backend/admin.js').registerAdminEndpoint('mailtemplates', 'POST', this.handlePOST);
    }
};

class LMLMail {
    setupController() {
        this.controller = new MailController();
        this.controller.bind();
    }

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

        log('Mail', 'Triggering email hook ' + hookname + ' for ' + to);
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
                    log('Mail', 'Preparing to send LML email to ' + to);
                    const email = that.createEmail(_c, to, template.subject);
                    email.setHTML(compiledPage);
                    that.send(email, () => {
                        log('Mail', 'Sent email to ' + to + ' from hook ' + hookname);
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

            /*
            fileserver.fileExists(_c.emails.gmailkey, function(exists) {
                if (!exists) {
                    return callback && callback(new Error("Missing gmail JSON key file"));
                }

                const googleKey = require(_c.emails.gmailkey);
                const jwtClient = new google.auth.JWT(
                    googleKey.client_email, 
                    null, 
                    googleKey.private_key, 
                    ['https://www.googleapis.com/auth/gmail.send'], 
                    senderInfo[email.siteid].user
                );

                jwtClient.authorize((err, tokens) => {
                    if (err) {
                        log('Mail', 'Could not send email because of JWT error => ' + err, 'err');
                        return callback && callback (err);
                    }

                    var gmail = google.gmail({version: 'v1'});
                    gmail.users.messages.send({
                        auth: jwtClient,
                        userId : senderInfo[email.siteid].user,
                        uploadType : 'media',
                        ressource : {
                            raw : require('js-base64').Base64.encodeURI(email.content)
                        }
                    }, (err, res) => {
                        if (err) {
                            log('Mail', 'Could not send email => ' + err, 'err');
                        }

                        callback && callback(err, res);
                    });
                });
            });
            */
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

    bind() {
        const that = this;
        require('./hooks').bind('settings_will_save', 50, (pkg) => {
            let conf = pkg._c;
            let newSender = {
                user : conf.emails.senderemail,
                pass : conf.emails.senderpass,
                from : conf.emails.senderfrom
            }

            that.setSender(pkg._c.id, newSender);
        });
    }
};

module.exports = new LMLMail();
