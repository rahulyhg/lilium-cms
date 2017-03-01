const log = require('./log.js');

let senderInfo = {
    default : {
        user : "",
        pass : "",
        from : "",
        handler : "gmail"
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

    attach(filepath) {
        this.files.push(filepath)
    }
}

class LMLMail {
    setSender(siteid, sender) {
        if (sender) {
            senderInfo[siteid] = senderInfo[siteid] || {};
            log('Mail', 'Updating sender info for website with id ' + siteid);

            for (var field in sender) {
                senderInfo[siteid][field] = sender[field];
            }
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
            const GMailer = require("gmail-sender");
            GMailer.options({
                smtp : {
                    service : "Gmail",
                    user : senderInfo[email.siteid].user,
                    pass : senderInfo[email.siteid].pass,
                }
            });

            GMailer.send({
                to : { email : email.to },
                subject : email.subject,
                text : email.content,
                // files : email.files
            }, (err, res) => {
                if (err) {
                    log('Mail', 'Could not send email => ' + err, 'err');
                }

                callback && callback(err, res);
            });
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
