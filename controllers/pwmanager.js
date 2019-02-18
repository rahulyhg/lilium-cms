const crypto = require('crypto');
const _c =require('../config');
const db = require('../lib/db');
const PwManager = require('../lib/pwmanager');
/**
 * Endpoints:
 * 
 *      GET /categories
 * 
 *      POST /categories
 *      POST /passwords/{categoryId}
 * 
 *      PUT /categories/{categoryId}
 *      PUT /passwords/{passwordId}
 * 
 *      DELETE /categories/{categoryId}
 *      DELETE /passwords/{passwordId}
 */
class PwManagerController {
    constructor() {            
        this.PwManager = new PwManager({
            algorithm: 'aes256',
            key: _c.default().signature.privatehash.substring(0, 32),
            inputEncoding: 'utf8',
            outputEncoding: 'hex'
        });
    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == 'categories') {
            this.PwManager.getCategories(cli.hasRight('admiin') ? '*' : cli.userinfo.rights, categories => {
                categories.forEach(category => {
                    category.passwords = category.passwords.map(password => { return { name: password.name, plaintext: password.plaintext, _id: password._id }; });
                });

                sendback({categories});

                log('PwManager', `User ${cli.userinfo.displayname} requested the password categories`, 'info');
            });
        } else if (levels[0] == 'passwords') {
            if (!levels[1]) sendback("Required categoryId");

            db.findToArray(_c.default(), 'passwords', { categoryId: db.mongoID(levels[1]) }, (err, passwords) => {
                sendback({ success: !err, passwords });
                log('PwManager', `User ${cli.userinfo.displayname} requested the passwords`, 'info');
            });
        }
    }

    adminPOST(cli) {
        if (cli.routeinfo.path[2] == 'categories') {
            if (cli.postdata.data.right && cli.hasRight(cli.postdata.data.right)) {
                this.PwManager.createCategory(cli.postdata.data.name, cli.postdata.data.right || '', (err, r) => {
                    cli.sendJSON({ success: !err, inserted: r });
                });
            } else {
                cli.throwHTTP(403, 'You cannot create a category with a right you do not have', true);
            }
        } else if (cli.routeinfo.path[2] == 'passwords') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                if (cli.postdata.data.name && cli.postdata.data.plaintext) {
                    this.PwManager.createPassword(cli.postdata.data.name, cli.postdata.data.plaintext, cli.routeinfo.path[3], (err, r) => {
                        if (r) {
                            r.iv, r.encrypted, r.inputEncoding, r.outputEncoding = undefined;
                        }
                        cli.sendJSON({ success: !err, inserted: r });
                    });
                } else {
                    cli.throwHTTP(401, 'This endpoint requires both a name and a plaintext field to create a password', true);
                }
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        } else {
            cli.throwHTTP(404, 'Not found', true);
        }
    }

    adminPUT(cli) {
        cli.readPostData(postdata => {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                if (cli.routeinfo.path[2] == 'passwords') {
                    this.PwManager.updatePassword(cli.routeinfo.path[3], cli.postdata.data, (err, r) => {
                        cli.sendJSON({ success: !err, err });
                    });
                } else if (cli.routeinfo.path[2] == 'categories') {
                    this.PwManager.updateCategory(cli.routeinfo.path[3], cli.postdata.data, (err, r) => {
                        cli.sendJSON({ success: !err });
                    });
                } else {
                    cli.throwHTTP(404, 'Endpoint not found', true);
                }
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        });
    }

    adminDELETE(cli) {
        if (cli.routeinfo.path[2] == 'categories') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                this.PwManager.removeCategory(cli.routeinfo.path[3], (err, r) => {
                    cli.sendJSON({ success: !err });
                    log('PwManager', `User ${cli.userinfo.displayname} deleted category with id ${cli.routeinfo.path[3]}`, 'warn');
                });
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        } else if(cli.routeinfo.path[2] == 'passwords') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                this.PwManager.removePassword(cli.routeinfo.path[3], (err, r) => {
                    cli.sendJSON({ success: !err });
                    log('PwManager', `User ${cli.userinfo.displayname} deleted password with id ${cli.routeinfo.path[3]}`, 'warn');
                });
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        } else {
            cli.throwHTTP(404, 'Not found', true);
        }
    }
}

module.exports = new PwManagerController();
