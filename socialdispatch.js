const db = require('./includes/db.js');
const formBuilder = require('./formBuilder.js');
const config = require('./config.js');
const filelogic = require('./filelogic.js');

const DISPATCH_COLLECTION = "socialdispatch";   // Website collection
const ACCOUNTS_COLLECTION = "socialaccounts";   // Network collection

class SocialPost {
    constructor(message, postid, published, time) {
        this.message = message;
        this.postid = db.mongoID(postid);
        this.published = typeof published == "undefined" ? true : published;
        this.time = new Date(time).getTime();
    }


}

class SocialDispatch {
    adminGET(cli) {
        switch (cli.routeinfo.path[2]) {
            case undefined:
            case "networks":
                filelogic.serveAdminLML3(cli);
                break;

            default:
                cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        let level = cli.routeinfo.path[2];

        if (level == "networks") {
            let accounts = cli.postdata.data.accounts || [];
            db.remove(config.default(), ACCOUNTS_COLLECTION, {}, () => {
                db.insert(config.default(), ACCOUNTS_COLLECTION, accounts, () => { 
                    cli.sendJSON({
                        success : true,
                        message : "Network has now " + cli.postdata.data.accounts.length + " social accounts.",
                        title : "Saved"
                    });
                });
            });
        } else {
            cli.throwHTTP(404, undefined, true);
        }
    }

    livevar(cli, levels, params, send) {
        let level = levels[0];

        if (level == "networks") {
            db.findToArray(config.default(), ACCOUNTS_COLLECTION, {}, (err, array) => {
                send(err || {accounts : array});
            });
        } else {
            send([]);
        }
    }

    form() {
        formBuilder.createForm('networksocialaccounts', {
            fieldWrapper: {
                tag: 'div',
                cssPrefix: 'settingsfield-'
            },
            cssClass: 'social-accounts-form'
        })
        .add('title', 'title', {
            displayname : "Network Social accounts"
        })
        .add('accounts', 'stack', {
            displayname : "Accounts",
            scheme : {
                columns : [
                    {
                        fieldName   : "displayname",
                        dataType    : "text",
                        displayname : "Display Name"
                    }, {
                        fieldName   : "network",
                        dataType    : "text",
                        displayname : "Network"
                    }, {
                        fieldName   : "accountid",
                        dataType    : "text",
                        displayname : "Account ID"
                    }, {
                        fieldName   : "accesstoken",
                        dataType    : "text",
                        displayname : "Access Token"
                    }
                ]
            }
        })
        .add('save', 'button', {
            displayname : "Save",
            classes : ["network-accounts-save"]
        });
    }

    setup() {
        db.createCollection(config.default(), ACCOUNTS_COLLECTION, () => {});
    }
}

module.exports = new SocialDispatch();
