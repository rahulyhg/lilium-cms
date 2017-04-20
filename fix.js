const log = require('./log.js');
const db = require('./includes/db.js');
const filelogic = require('./filelogic.js');
const config = require('./config.js');

const PRIORITIES = {
    "0" : "Level 0 : Whenever",
    "2" : "Level 2 : Within the next few weeks",
    "4" : "Level 4 : This week",
    "6" : "Level 6 : As soon as possible",
    "8" : "Level 8 : Right now"
}

const MODULES = {
    "editorial" : "Article redaction",
    "ui" : "User interface",
    "frontend_appear" : "Website appearance",
    "frontend_func" : "Website functionality",
    "chat" : "Chat",
    "entities" : "Entities and users",
    "vocab" : "Language and vocabulary",
    "emails" : "Emails",
    "notifications" : "Notifications",
    "auth" : "Login and authentication",
    "unknown" : "Something else"
};

class LiliumRequestCommunication {
    constructor(requestid, authorid, content, statuschange) {
        this.requestid = requestid;
        this.authorid = authorid;
        this.content = content;
        this.statuschange = statuschange || undefined;
        this.at = new Date();
    }
};

class LiliumRequest {
    constructor(authorid, title, steps, priority, module) {
        this.title = title || "";
        this.reprosteps = steps || "";
        this.status = "open";
        this.priority = priority || 0;
        this.module = module || "unknown";
        this.author = authorid || "";
    }
};

class Fix {
    livevar(cli, levels, params, send) {
        db.findToArray(config.default(), 'fix', {type : "issue", status : {$ne : "closed"}}, (err, issues) => {
            db.findToArray(config.default(), 'fix', {type : "feature", status : {$ne : "closed"}}, (err, features) => {
                db.findToArray(config.default(), 'fix', {type : "urgent", status : {$ne : "closed"}}, (err, emergencies) => {
                    send({
                        issues : issues,
                        featurerequests : features,
                        emergencies : []
                    })
                });
            });
        });
    }

    adminGET(cli) {
        filelogic.serveAdminLML(cli);
    }

    adminPOST(cli) {
        cli.throwHTTP(501);
    }
}

module.exports = new Fix();
