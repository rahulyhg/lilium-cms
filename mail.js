const log = require('./log.js');
const google = require('googleapis');
const fileserver = require('./fileserver.js');
const nodemailer = require('nodemailer');

let senderInfo = {
    default : {
        user : "",
        pass : "",
        from : "",
        handler : "gmail",
        transporter : {}
    }
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
}

class LMLMail {
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

    createEmail(_c, to, subject, content) {
        return new EMail(_c.id, to, subject, content);
    }

    sendGMail(email, callback) {
        if (!email.to || !email.subject || !email.content) {
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
}

module.exports = new LMLMail();
