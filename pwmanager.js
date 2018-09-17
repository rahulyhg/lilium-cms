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

    createCategory(name, role, done) {
        const newCategory = { name, role };
        db.insert(_c.default(), 'categories', newCategory, (err, r) => {
            done && done(newCategory);
        });
    }

    /**
     * Returns a new instance of password created with the settings provided to PwManager
     * @param {string} name The name of the password
     * @param {string} plaintext The plaintext version of the password
     * @returns {Password} A password created with the settings provided to PwManager
     */
    createPassword(name, plaintext) {
        return new Password(name, plaintext, this.settings)
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
     * @param {array} passwords optionnal Array of passwords contained within the category
     */
    constructor(name, right, passwords) {
        this.name = name;
        this.role = right;
        this.passwords = passwords || [];
    }

    /**
     * 
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
     */
    constructor(name, plaintext) {
        // encrypted is set to undefined and is generated on demand to avoid doing it each time
        // a new instance is created
        this.encrypted = undefined;
        this.iv = undefined;
        this.name = name;
        this.plaintext = plaintext;
        this.settings = settings;
    }

    /**
     * Returns the encrypted version of the password. Only performs the encryption algorithm
     * if the password hadn't been encrypted before, else, returns a 'cached' version of the encrypted password
     */
    getEncrypted() {
        if (this.encrypted) return this.encrypted;

        this.iv = new Buffer.from(crypto.randomBytes(16));
        const cipher = crypto.createCipheriv(this.settings.algorithm, this.settings.key, this.iv);
        let crypted = cipher.update(this.plaintext, this.settings.inputEncoding, this.settings.outputEncoding);
        crypted += cipher.final(this.settings.outputEncoding);

        this.encrypted = crypted.toString();
        return this.encrypted;
    }

    /**
     * Returns the plaintext version of the password. Only performs the decryption algorithm
     * if the password hadn't been decrypted before, else, returns a 'cached' version of the plaintext password
     */
    getPlaintext() {
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
        return {...this, encrypted: this.getEncrypted()};
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
            key: _c.default().signature.privatehash.substring(0, 32),
            inputEncoding: 'utf8',
            outputEncoding: 'hex'
        });
    }

    livevar(cli, levels, params, sendback) {
        if (levels[0] == 'categories') {
            const pipeline = [
                {$match: {
                    right: {$in: cli.rights}
                }},
                {$lookup: {
                    from: 'passwords',
                    localField: '_id',
                    foreignField: 'categoryId',
                    as: 'passwords'
                }},
                {$project: {
                    name: 1,
                    "passwords.wtv": 1
                }}
            ];

            db.join(_c.default(), 'pwmanagercategories', pipeline, categories => {
                sendback({categories});
            });
        } else if (levels[0] == 'passwords') {
            if (!levels[1]) sendback("[PwManagerLivevarException] - Required categoryId");

            db.findToArray(_c.default(), 'passwords', { categoryId: db.mongoID(levels[1]) }, (err, passwords) => {
                sendback({ success: !err, passwords });
            });
        }
    }

    adminPOST(cli) {
        if (cli.routeinfo.path[2] == 'categories') {
            const newCategory = new Category(cli.postdata.data.name, cli.postdata.data.right || '');

            db.insert(_c.default(), 'pwmanagercategories', newCategory, (err, r) => {
                cli.sendJSON({ success: !err, inserted: newCategory });
            });
        } else if (cli.routeinfo.path[2] == 'passwords') {
            if (db.isValidMongoID(cli.routeinfo.path[3])) {
                const newPassword = new Password(cli.postdata.data.name, cli.postdata.data.plaintext);
                console.log(newPassword);
                

                db.insert(_c.default(), 'pwmanagerpasswords', newPassword, (err, r) => {
                    console.log(err, r);
                    console.log(newPassword);
                    
                })
            } else {
                cli.throwHTTP(401, 'This endpoint requires a valid categoryId as a url param', true);
            }
        }
    }

    adminPUT(cli) {
        cli.sendJSON({endpoint: 'PUT /pwmanager'})
    }

    adminDELETE(cli) {
        cli.sendJSON({endpoint: 'DELETE /pwmanager'})
    }
}

module.exports = new PwManagerController();
