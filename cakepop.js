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

        if (action == "new") {
            if (cli.postdata.data.displayname) {
                let newDocument = {
                    title : cli.postdata.data.displayname,
                    status : "creation",
                    content : "<p>Write a <i>cute message</i> here.</p>",
                    stylesheet : "#cakepop-content {\n\n}\n#cakepop-html {\n\n}",
                    read : [],
                    responses : [],
                    expiry : new Date().getTime() + (1000 * 60 * 60 * 24 * 7)
                };

                db.insert(config.default(), CAKEPOP_COLLECTION, newDocument, () => {
                    cli.sendJSON({
                        success : true,
                        id : newDocument._id,
                        redirect : cli._c.server.url + "/admin/cakepop/edit/" + newDocument._id
                    });
                });
            } else {
                cli.sendJSON({success : false, reason : "No displayname provided"})
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
                    found : !!obobj,
                    cakepop : dbobj
                });
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
                query.title = new RegExp(filters.search);
            }

            db.find(config.default(), CAKEPOP_COLLECTION, query, [], (err, cur) => {
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
        .add('content', 'ckeditor', {nolabel : true, classes : ["no-style"]})
        .add('stylesheet', 'textarea', {displayname : "Custom CSS", rows : 10})
        .add('nocontainer', 'checkbox', {displayname : "Do not use the default container"})
        .add('responses', 'stack', {
            displayname : "Responses",
            scheme : {
                columns : [
                    { fieldName : "identifier",     dataType : "text", displayname : "Identifier"   }, 
                    { fieldName : "displayname",    dataType : "text", displayname : "Display Name" }, 
                    { fieldName : "color",          dataType : "text", displayname : "Color (HEX)"  }
                ]
            }
        })
        .add('expiry', 'date', {
            displayname : "Expiry",
            datetime : true, 
            context : 'edit',
            classes : ["lml-date"]
        })
        .add('publish-set', 'buttonset', { 
            buttons : [
                {
                    'name' : 'save',
                    'displayname': 'Save',
                    'type' : 'button',
                    'classes': ['btn-save']
                }, {
                    'name' : 'view',
                    'displayname': 'Test Cakepop',
                    'type' : 'button',
                    'classes': ['btn-preview']
                }        
            ]
        });
    }
}

module.exports = new Cakepop();
