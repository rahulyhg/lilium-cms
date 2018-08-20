/**************************************************************************************************************************
 *
 *  CAKEPOP
 *
 * 
 *  Logic ~
 * 
 *  On page load, request the latests unread cakepops
 *  If cakepops are unread and current date is before expiry date, return data. 
 * 
 *  Anatomy ~
 * 
 *  Admin frontend will contain a prebuilt dim with a container for the cakepop. 
 *  When cakepops are received, a field will contain the HTML to be injected in the container. 
 *  Upon pressing “dismiss”, the cakepop will send a POST request to mark the pop as read. 
 * 
 *  Backend ~
 * 
 *  An interface will be available to create cakepops. 
 *  The form will include a HTML CKEditor box, a title, an expiry date
 *  A “view” will include a list of all the entities associated with their response, or “dismissed”.
 *  A cakepop can either be published or pending before it’s invalidated by the expiry date being reached.
 *
 *  Database Schema ~
 *
 *  { title : "", content : "<markup>", read : [], responses : [], status : "", expiry : Date, createdBy : ObjectId }
 *
 *************************************************************************************************************************/

const db = require('./includes/db.js');
const filelogic = require('./filelogic.js');
const config = require('./config.js');
const hooks = require('./hooks');
const LML3 = require('./lml3/compiler.js');

const CAKEPOP_COLLECTION = "cakepops";

class Cakepop {
    adminGET(cli) {
        if (cli.routeinfo.path[2] == "edit") {
            filelogic.serveAdminLML3(cli, true);
        } else if (!cli.routeinfo.path[2]) {
            filelogic.serveAdminLML3(cli);
        } else {
            cli.throwHTTP(404);
        }
    }

    adminPOST(cli) {
        let action = cli.routeinfo.path[2];

        if (action == "new" && cli.hasRight('cakepop')) {
            if (cli.postdata.data.displayname) {
                let newDocument = {
                    title : cli.postdata.data.displayname,
                    status : "creation",
                    content : "<p>Write a <i>cute message</i> here.</p>",
                    stylesheet : "#cakepop-content {\n\n}\n#cakepop-html {\n\n}",
                    read : [],
                    responses : [],
                    nocontainer : false,
                    mendatory : false,
                    auto : false,
                    history : [{action : "creation", by : cli.me(), at : new Date().getTime()}],
                    expiry : new Date().getTime() + (1000 * 60 * 60 * 24 * 7)
                };

                db.insert(config.default(), CAKEPOP_COLLECTION, newDocument, () => {
                    hooks.fire('createdCakepop', {cakepop : newDocument, by : db.mongoID(cli.userinfo.userid)});
                    cli.sendJSON({
                        success : true,
                        id : newDocument._id,
                        redirect : cli._c.server.url + "/admin/cakepop/edit/" + newDocument._id
                    });
                });
            } else {
                cli.sendJSON({success : false, reason : "No displayname provided"})
            }
        } else if (action == "updateOneField" && cli.hasRight('cakepop')) {
            db.update(config.default(), CAKEPOP_COLLECTION, {_id : db.mongoID(cli.routeinfo.path[3])}, {
                [cli.postdata.data.field] : cli.postdata.data.value   
            }, () => {
                cli.sendJSON({ ok : 1 });
            });
        } else if (action == "save" && cli.hasRight('cakepop')) {
            const d = cli.postdata.data;
            db.update(config.default(), CAKEPOP_COLLECTION, {_id : db.mongoID(cli.routeinfo.path[3])}, d, () => {
                hooks.fire('editedCakepop', {diff : d, by : db.mongoID(cli.userinfo.userid)});
                cli.sendJSON({
                    success : true,
                    type : "success",
                    title : "Cakepop saved successfully",
                    message : ""
                });
            })
        } else if (action == "read" || action == "respond") {
            if (cli.postdata.data.id) {
                db.update(config.default(), CAKEPOP_COLLECTION, {_id : db.mongoID(cli.postdata.data.id), mendatory : action == "respond"}, {
                    $addToSet : {
                        read : cli.me(),
                        history : {
                            action, 
                            by : cli.me(), 
                            response : cli.postdata.data.response, 
                            at : new Date().getTime()
                        }
                    }
                }, () => {                
                    hooks.fire('cakepopOpen', { _id : db.mongoID(cli.postdata.data.id), by : cli.me(), response : cli.postdata.data.response });
                    cli.sendJSON({delicious : true, userid : cli.userinfo.userid, cakepop : cli.postdata.data.id});
                }, false, true, true);
            } else {
                cli.throwHTTP(400, undefined, true);
            }
        } else {
            cli.throwHTTP(404);
        }
    }

    deepFetch(id, sendback) {
        db.join(require('./config.js').default(), CAKEPOP_COLLECTION, [
            {
                $match : {
                    _id : id
                }
            }, {
                $lookup : {
                    localField : "createdBy",
                    from : "entities",
                    foreignField : "_id",
                    as : "createdByEntity"
                }
            }
        ], (arr) => {
            sendback(arr[0]);
        });
    }

    livevar(cli, levels, params, sendback) {
        let action = levels[0];
        if (action == "latests") {
            let now = new Date().getTime();
            db.findUnique(config.default(), CAKEPOP_COLLECTION, {
                read : {$ne : db.mongoID(cli.userinfo.userid)},
                expiry : {$gt : now},
                status : "live"
            }, (err, dbobj) => {
                sendback({
                    found : !!dbobj,
                    cakepop : dbobj
                });
            }, {
                content : 1, stylesheet : 1, html : 1, expiry : 1,
                nocontainer : 1, mendatory : 1, auto : 1, responses : 1
            });
        } else if (action == "single") {
            let id = db.mongoID(levels[1]);
            this.deepFetch(id, (ckp) => {
                sendback(ckp);
            });
        } else if (action == "bunch") {
            let now = new Date();
            let t = now.getTime();

            let limit = params.max || 50;
            let query = { $and : [{status : {$ne : "deleted"}}] };
            let filters = params.filters || {};

            if (filters.status) {
                let ftc = filters.status == "live" ? "$gt" : "$lt";
                query.expiry = { [ftc] : t }
            }

            if (filters.search) {
                try {
                    query.title = new RegExp(filters.search.toLowerCase(), 'i');
                } catch (ex) {
                    query.title = filters.search.toLowerCase();
                }
            }

            db.find(config.default(), CAKEPOP_COLLECTION, query, [], (err, cur) => {
                cur.sort({_id : -1}).limit(limit).project({
                    title : 1,
                    expiry : 1,
                    status : 1,
                    read : 1
                }).toArray((err, arr) => {
                    arr.forEach(x => {
                        x.expired = x.expiry < t;
                        x.status = x.expired ? "expired" : x.status;
                        x.read = x.read && x.read.length || 0;
                    });
                    sendback({
                        items: arr
                    });
                });
            });
        } else {
            sendback("[CakepopLivevarException] - Required first level");
        }
    }

    form() {
     
    }
}

module.exports = new Cakepop();
