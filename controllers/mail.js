const db = require('../lib/db.js');
const filelogic = require('../pipeline/filelogic');
const LMLMail = require('../lib/mail');

class MailController {
    livevar(cli, levels, params, sendback) {
        if (cli.hasRight('edit-emails')) {
            if (levels[0] == "search") {
                let $match= { deleted: { $ne: true } };
                if (params.filters.search) {
                    $match.displayname = new RegExp(params.filters.search, 'i');
                }

                if (params.filters.hook) {
                    $match.hooks = params.filters.hook;
                }

                db.join(cli._c, 'mailtemplates', [
                    {$match},
                    {$sort : {_id : -1}},
                    {$skip : params.skip || 0},
                    {$limit : params.limit || 30},
                    {$project : {
                        active: 1, 
                        description: 1,
                        displayname: 1,
                        hooks: 1,
                        subject: 1
                    }}
                ], (items) => {
                    sendback({ items });
                });
            } else if (levels[0] == "hooks") {
                let arr = [];
                for (var name in LMLMail.mailHooks) {
                    arr.push(Object.assign(LMLMail.mailHooks[name], {name : name}));
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
        db.update(cli._c, 'mailtemplates', { _id: db.mongoID(cli.routeinfo.path[2]) }, { hooks: '', deleted: true, active : false }, (err, r) => {
            cli.sendJSON({ updated: !!r.nModified });
        });
    }

    adminPOST(cli) {
        if (!cli.hasRight('edit-emails')) {
            return cli.throwHTTP(403);
        }

        switch (cli.routeinfo.path[2]) {
            case 'edit':
                LMLMail.MailTemplate.save(cli._c, cli.routeinfo.path[3], cli.postdata.data, (err) => {
                    cli.sendJSON({success : !err, error : err});
                });
                break;
            case 'new':
                db.insert(cli._c, 'mailtemplates', new LMLMail.MailTemplate(cli.postdata.data.displayname), (err, r) => {
                    cli.sendJSON({ success: !err, err });
                });
                break;
            default:
                cli.throwHTTP(404);
        }
    }
};

module.exports = new MailController();
