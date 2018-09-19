/**
 * Module that allows Lilium users to store and share passwords for network shared accounts like Facebook, Instagram, etc...
 * Like any password manager, since the passwords need to be retrieved, they are encrypted, not hashed.
 * The passwords are grouped inside categories and categories can be protected by requiring a specific Lilium right to access.
 */

const crypto = require('crypto');
const _c =require('./config');
const db = require('./includes/db');

class PwManager {

    /**
     * Instantiates a PwManager
     * @param {object} settings Settings for password encryption / decryption
     * @param {string} settings.algorithm Encryption algorithm to use
     * @param {string} settings.inputEncoding Encoding of the plaintext
     * @param {string} settings.outputEncoding Encoding of the ciphered password} settings 
     */
    constructor(settings) {
        // AES256 key length is 32 Octets
        this.settings = settings;
    }

    /** Categories */

    /**
     * Fetches a category from the database
     * @param {string} id id of the category to fetch
     * @param {callback} done 
     */
    getCategory(id, done) {
        db.findUnique(_c.default(), 'pwmanagercategories', { _id: db.mongoID(id) }, (err, r) => {
            done && done(err, r);
        });
    }

    /**
     * Gets the categories the current user has the rights for from the database
     * @param {array} userRights The rights of the current user
     * @param {callback} done 
     */
    getCategories(userRights, done) {
        const pipeline = [
            {$match: {
                right: {$in: userRights}
            }},
            {$lookup: {
                from: 'pwmanagerpasswords',
                localField: '_id',
                foreignField: 'categoryId',
                as: 'passwords'
            }},
            {$project: {
                name: 1,
                right: 1,
                "passwords.name": 1,
                "passwords.plaintext": 1
            }}
        ];

        db.join(_c.default(), 'pwmanagercategories', pipeline, done);
    }

    /**
     * Creates a new category
     * @param {string} name The name of the category
     * @param {string} right THe right required to access the category
     * @param {callback} done 
     */
    createCategory(name, right, done) {
        const newCategory = new Category(name, right);

        db.insert(_c.default(), 'pwmanagercategories', newCategory, (err, r) => {
            done && done(err, newCategory);
        });
    }

    removeCategory(id, done) {
        db.remove(_c.default(), 'pwmanagercategories', { _id: db.mongoID(id) }, done, true);
    }

    /* Passwords */

    getPassword(id, done) {
        db.findUnique(_c.default(), 'pwnamagerpasswords', { _id: db.mongoID(id) }, (err, r) => {
            done && done(err, r);
        });
    }

    /**
     * Returns a new instance of password created with the settings provided to PwManager
     * @param {string} name The name of the password
     * @param {string} plaintext The plaintext version of the password
     * @returns {Password} A password created with the settings provided to PwManager
     */
    createPassword(name, plaintext, categoryId, done) {
        const newPassword = new Password(name, plaintext, this.settings);
        newPassword.categoryId = db.mongoID(categoryId);
        newPassword.encrypt();

        db.insert(_c.default(), 'pwmanagerpasswords', newPassword, (err, r) => {
            done && done(err, newPassword);
        });
    }

    removePassword(id, done) {
        db.remove(_c.default(), 'pwmanagerpasswords', { _id: db.mongoID(id) }, done, true);
    }
}

/**
 * ENtity that holds multiple passwords and requires a particular role to access.
 */
class Category {

    /**
     * Instanciates a Category object
     * @param {string} name Name of the category to be created
     * @param {string} right name of the right requirenewCategoryd
     */
    constructor(name, right) {
        this.name = name;
        this.right = right;
    }

    /**
     * Adds the password to the current category, SETS the passwords categoryId attribute.
     * @param {Password} password The password to add to the collection
     */
    addPassword(password) {
        return this.passwords.push(password);
    }
}

class Password {

    /**
     * Creates a new instance of Password. Should be called by pwManager.createPassword() so it recieves consistent settings.
     * @param {string} plaintext The plaintext version of the password
     * @param {string} name The name of the platform the password is used for i.e. 'Instagram'
     * @param {object} settings Settings for password encryption / decryption
     * @param {string} settings.algorithm Encryption algorithm to use
     * @param {string} settings.inputEncoding Encoding of the plaintext
     * @param {string} settings.outputEncoding Encoding of the ciphered password} settings 
     */
    constructor(name, plaintext, settings) {
        // encrypted is set to undefined and is generated on demand to avoid doing it each time
        // a new instance is created
        this.name = name;
        this.plaintext = plaintext;
        this.iv = undefined;
        this.encrypted = undefined;
        this.categoryId = undefined;
        this.settings = settings;
    }

    /**
     * Returns the encrypted version of the password. Only performs the encryption algorithm
     * if the password hadn't been encrypted before, else, returns a 'cached' version of the encrypted password
     */
    encrypt() {
        if (!this.iv) this.iv = new Buffer.from(crypto.randomBytes(16));
        const cipher = crypto.createCipheriv(this.settings.algorithm, this.settings.key, this.iv);
        let crypted = cipher.update(this.plaintext, this.settings.inputEncoding, this.settings.outputEncoding);
        crypted += cipher.final(this.settings.outputEncoding);

        this.encrypted = crypted.toString();
        console.log('encrypted', this.encrypted);
        return this.encrypted;
    }

    /**
     * Returns the plaintext version of the password. Only performs the decryption algorithm
     * if the password hadn't been decrypted before, else, returns a 'cached' version of the plaintext password
     */
    decrypt() {
        if (this.plaintext) return this.plaintext;

        if (!this.encrypted || !this.iv) throw new Error('Either the encrypted version of the password or the iv were undefined');

        const decipher = crypto.createDecipheriv(this.settings.algorithm, this.settings.key, this.iv);
        let decrypted = decipher.update(this.encrypted, this.settings.outputEncoding, this.settings.inputEncoding);
        decrypted += decipher.final(this.settings.inputEncoding);

        return decrypted.toString();
    }

    setPlaintext(plaintext) {
        this.plaintext = plaintext;
        this.encrypted = this.iv = undefined;
    }

    toJSON() {
        console.log('toJSON()', {...this, encrypted: this.encrypt(), settings: undefined });
        
        return {...this, encrypted: this.encrypt(), settings: undefined };
    }
}

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
            this.PwManager.getCategories(cli.userinfo.rights, categories => {
                sendback({categories});
            });
        } else if (levels[0] == 'passwords') {
            if (!levels[1]) sendback("Required categoryId");

            db.findToArray(_c.default(), 'passwords', { categoryId: db.mongoID(levels[1]) }, (err, passwords) => {
                sendback({ success: !err, passwords });
            });
        }
    }

    adminPOST(cli) {
        if (cli.routeinfo.path[2] == 'categories') {
            this.PwManager.createCategory(cli.postdata.data.name, cli.postdata.data.right || '', (err, r) => {
                cli.sendJSON({ success: !err, inserted: r });
            });
        } else if (cli.routeinfo.path[2] == 'passwords') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                this.PwManager.createPassword(cli.postdata.data.name, cli.postdata.data.plaintext, cli.routeinfo.path[3], (err, r) => {
                    cli.sendJSON({ success: !err, inserted: r });
                });
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        } else {
            cli.throwHTTP(404, 'Not found', true);
        }
    }

    adminPUT(cli) {
        if (db.isValidMongoID(cli.routeinfo.path[3])) {
        } else {
            cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
        }
    }

    adminDELETE(cli) {
        if (cli.routeinfo.path[2] == 'categories') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                this.PwManager.removeCategory(cli.routeinfo.path[3], (err, r) => {
                    cli.sendJSON({ success: !err });
                });
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        } else if(cli.routeinfo.path[2] == 'passwords') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                this.PwManager.removePassword(cli.routeinfo.path[3], (err, r) => {
                    cli.sendJSON({ success: !err });
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
