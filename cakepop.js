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

const log = require('./log.js');
const db = require('./includes/db.js');
const formbuilder = require('./formBuilder.js');
const filelogic = require('./filelogic.js');
const config = require('./config.js');
const LML3 = require('./lml3/compiler.js');

class Cakepop {
    adminGET(cli) {
        if (cli.routeinfo.path[2]) {
            cli.throwHTTP(404);
        } else {
            filelogic.serveAdminLML3(cli);
        }
    }

    adminPOST(cli) {
        let action = cli.routeinfo.path[1];
        cli.sendJSON({ message : "Not finished" });
    }

    livevar(cli, levels, params, sendback) {
        var action = levels[0];
        if (action == "latests") {
            let now = new Date();
            db.findUnique(config.default(), "cakepops", {
                read : {$ne : db.mongoID(cli.userinfo.userid)},
                expiry : {$gt : now},
                status : "live"
            }, (err, dbobj) => {
                sendback({
                    found : !!obobj,
                    cakepop : dbobj
                });
            });
        } else if (action == "bunch") {
            let now = new Date();
            let t = now.getTime();

            let limit = params.max || 50;
            let query = { $and : [{status : {$ne : "deleted"}}] };
            let filters = params.filters || {};

            if (filters.status) {
                query.status = filters.status;
            }

            if (filters.search) {
                query.title = new RegExp(filters.search);
            }

            db.find(config.default(), 'cakepops', query, [], (err, cur) => {
                cur.sort({_id : -1}).limit(limit).project({
                    title : 1,
                    expiry : 1,
                    status : 1
                }).toArray((err, arr) => {
                    arr.forEach(x => {
                        x.expired = x.expiry < t;
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
        formbuilder.createForm('cakepop_edit', {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                'id': 'cakepop_edit',
                'inner': true
            },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add('title', 'text', { displayname : "Title" })
    }
}

module.exports = new Cakepop();
