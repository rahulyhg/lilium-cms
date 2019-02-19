const db = require('./db.js');
const filelogic = require('../pipeline/filelogic');
const config = require('./config');
const hooks = require('./hooks');

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
    "entire_system" : "Entire system",
    "unknown" : "Something else"
    
};

const TYPES = {
    "issue" : "Issue",
    "feature" : "Feature request",
    "urgent" : "Urgent"
}

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
    constructor(data) {
        this.type = data.type || "issue";
        this.title = data.title || "";
        this.reprosteps = data.reprosteps || "";
        this.content = data.content || "";
        this.status = "open";
        this.priority = data.priority || 0;
        this.module = data.module || "unknown";
        this.author = data.author || "";
        this.at = new Date();
    }
};

class FixLib {
    get PRIORITIES() { return PRIORITIES; }
    get MODULES() { return MODULES; }
    get TYPES() { return TYPES; }

    deepFetch(id, send) {
        db.findUnique(config.default(), 'fix', {_id : db.mongoID(id)}, (err, ticket) => {
            db.findToArray(config.default(), 'fixcomm', {fixid : ticket._id}, (err, comms) => {
                db.findUnique(config.default(), 'entities', {_id : ticket.author}, (err, author) => {
                    ticket.communications = comms;
                    ticket.author = author;

                    send(ticket);
                });
            });
        });
    }

    notifyDevs(_c, issue) {
        db.findToArray(config.default(), 'entities', {roles : "developer"}, (err, devs) => {
            db.findUnique(config.default(), 'entities', {_id : issue.author}, (err, author) => {
                for (let i = 0; i < devs.length; i++) {
                    let dev = devs[i];
                    require('./mail.js').triggerHook(_c, 'ticket_submitted', dev.email, {
                        config : _c,
                        to : dev,
                        ticket : issue,
                        author : author,
                        type : TYPES[issue.type],
                        module : MODULES[issue.module]
                    });
                }
            });
        });
    }

    notifyOriginalPoster(_c, agentid, ticket, message, newStatus) {
        db.findUnique(config.default(), 'fix', {_id : ticket._id}, (err, ticket) => {
            db.findUnique(config.default(), 'entities', {_id : ticket.author}, (err, to) => {
                db.findUnique(config.default(), 'entities', {_id : db.mongoID(agentid)}, (err, from) => {
                    require('./mail.js').triggerHook(_c, 'ticket_status_update', to.email, {
                        config : _c,
                        to : to,
                        cc : [from.email],
                        from : from,
                        ticket : ticket,
                        message : message,
                        newStatus : newStatus,
                        type : TYPES[ticket.type],
                        module : MODULES[ticket.module]
                    });
                });
            });
        });
    }

    updateTicket(_c, id, ticket, done) {
        db.update(config.default(), 'fix', {_id : id}, ticket, done);
    }

    update(cli, id) {
        if (cli.hasRight('developer')) {
            let data = cli.postdata.data;
            let ticketid = db.mongoID(id);
            let message = data.message.toString();
            let newStatus = data.status;
            delete data.message;

            let done = () => {
                data._id = ticketid;
                message && this.notifyOriginalPoster(cli._c, cli.userinfo.userid || cli.userinfo._id, data, message, newStatus);
                cli.sendJSON({
                    success : true
                });
            }

            this.updateTicket(cli._c, ticketid, data, done.bind(this));
        } else {
            cli.sendJSON({
                success : false,
                error : "Missing rights"
            });
        }
    }

    createTicket(_c, data, done) {
        let issue = new LiliumRequest(data);
        done = done.bind(this);
        if (issue.title && (issue.reprosteps || issue.content)) {
            db.insert(config.default(), 'fix', issue, () => {
                this.notifyDevs(_c, issue);
                done();
            });
        } else {
            done("Missing fields");
        }
    }

    open(cli, context) {
        let data = cli.postdata.data;
        data.author = db.mongoID(cli.userinfo.userid || cli.userinfo._id);

        log("Support", "Opening " + context + " from entity " + cli.userinfo.displayname, 'info');
        switch (context) {
            case "issue":
                data.type = "issue";
                break;
            case "featurerequest":
                data.type = "feature";
                break;
            case "emergency":
                data.type = "urgent";
                data.module = "entire_system";
                data.priority = 8;
                break;
            default:
                data.type = "unknown";
        }

        this.createTicket(cli._c, data, (err) => {
            if (err) {
                cli.sendJSON({success : false, error : err});
            } else {
                cli.sendJSON({success : true});
            }

            db.count(config.default(), 'fix', {author : data.author, type : data.type}, (err, count) => {
                hooks.fire(data.type + "_submitted", {
                    _c : cli._c,
                    score : count,
                    entity : data.author
                });
            });
        });
    }


}
