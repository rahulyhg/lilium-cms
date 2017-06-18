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
 *  { title : "", content : "<html>", read : [], responses : [], status : "", expiry : Date, createdBy : ObjectId }
 *
 *************************************************************************************************************************/

const log = require('./log.js');
const db = require('./includes/db.js');
const formbuilder = require('./formBuilder.js');
const filelogic = require('./filelogic.js');
const config = require('./config.js');

class Cakepop {
    adminGET(cli) {
        cli.response.end("Working");
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
        } else {
            sendback("[CakepopLivevarException] - Required first level");
        }
    }

    form() {

    }
}

module.exports = new Cakepop();
