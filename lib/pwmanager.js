/**
 * Module that allows Lilium users to store and share passwords for network shared accounts like Facebook, Instagram, etc...
 * Like any password manager, since the passwords need to be retrieved, they are encrypted, not hashed.
 * The passwords are grouped inside categories and categories can be protected by requiring a specific Lilium right to access.
 */

const crypto = require('crypto');
const _c =require('../lib/config');
const db = require('./db');

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
                "passwords._id": 1,
                "passwords.iv": 1,
                "passwords.encrypted": 1,
                "passwords.plaintext": 1
            }}
        ];

        if (userRights == '*') {
            delete pipeline[0].$match.right;
        }

        db.join(_c.default(), 'pwmanagercategories', pipeline, categories => {
            const allCategories = categories.map(category => new Category(category.name, category.right, category.passwords, category._id));
            allCategories.forEach(category => { 
                category.passwords = category.passwords.map(password => new Password(password.name, password._id, null, this.settings, password.encrypted, password.iv));
            });

            done && done(allCategories);
        });
    }

    /**
     * Creates a new category
     * @param {string} name The name of the category
     * @param {string} right THe right required to access the category
     * @param {callback} done 
     */
    createCategory(name, right, done) {
        const newCategory = new Category(name, right);
        console.log(newCategory);
        
        db.insert(_c.default(), 'pwmanagercategories', newCategory, (err, r) => {
            console.log(err, r);
            
            done && done(err, newCategory);
        });
    }

    updateCategory(id, val, done) {
        // No need to instanciate a Category object to only update, avoiding the overhead
        db.update(_c.default(), 'pwmanagercategories', { _id: db.mongoID(id) }, val, done);
    }

    removeCategory(id, done) {
        db.remove(_c.default(), 'pwmanagercategories', { _id: db.mongoID(id) }, (err, r) => {
            if (!err) {
                db.remove(_c.default(), 'pwmanagerpasswords', { categoryId: db.mongoID(id) }, done);
            }else {
                done && done(err, r);
            }
        }, true);
    }

    /* Passwords */

    getPassword(id, done) {
        db.findUnique(_c.default(), 'pwmanagerpasswords', { _id: db.mongoID(id) }, done);
    }

    /**
     * Returns a new instance of password created with the settings provided to PwManager
     * @param {string} name The name of the password
     * @param {string} plaintext The plaintext version of the password
     * @returns {Password} A password created with the settings provided to PwManager
     */
    createPassword(name, plaintext, categoryId, done) {
        const newPassword = new Password(name, undefined, plaintext, this.settings);
        newPassword.categoryId = db.mongoID(categoryId);
        newPassword.encrypt();
        
        // Clone the object to hide the plaintext version of the password from the database
        // but still be able to return the plaintext to the client
        const dbPrepped = {...newPassword};
        dbPrepped.plaintext = undefined;
        dbPrepped.settings = undefined;

        db.insert(_c.default(), 'pwmanagerpasswords', dbPrepped, (err, r) => {
            // Get the _id property of the inserted document
            newPassword._id = dbPrepped._id;
            done && done(err, newPassword);
        });
    }

    updatePassword(id, val, done) {
        // prevent client from directly changing the encrypted version of the password
        delete val.encrypted
        
        // If plaintext is updated, instantiate a Password object to access the encryption methods
        // else update directly
        if (Object.keys(val).includes('plaintext')) {
            this.getPassword(id, (err, r) => {
                
                if (err)  {
                    done && done(err, r);
                } else {
                    const password = new Password(val.name || r.name, r._id, val.plaintext, this.settings);
                    
                    db.update(_c.default(), 'pwmanagerpasswords', { _id: db.mongoID(id) }, {
                            name: password.name,
                            encrypted: password.encrypted,
                            iv: password.iv }
                        , done);
                }
            });
        } else {
            db.update(_c.default(), 'pwmanagerpasswords', { _id: db.mongoID(id) }, val, done);
        }
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
     * @param {array} passwords Passwords held within this category
     * @param {mongoID} name Id of the category
     */
    constructor(name, right, passwords, id) {
        this.name = name;
        this.right = right;
        this.passwords = passwords || [];
        this._id = id;
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
     * @param {string} encrypted Encrypted version of the password, used when a password is retrieved from the db
     * @param {string} iv Initialisation vector for the password, used when a password is retrieved from the db
     */
    constructor(name, id, plaintext, settings, encrypted, iv) {
        // encrypted is set to undefined and is generated on demand to avoid doing it each time
        // a new instance is created
        this.name = name;
        this._id = id;
        this.plaintext = plaintext;
        this.encrypted = encrypted;
        this.categoryId = undefined;
        this.settings = settings;

        if (iv) {
            this.iv = iv.buffer;
        }

        if (!this.plaintext) {
            this.plaintext = this.decrypt();
        }

        if (!this.encrypted) {
            this.encrypt();
        }
    }

    /**
     * Returns the encrypted version of the password. Only performs the encryption algorithm
     * if the password hadn't been encrypted before, else, returns a 'cached' version of the encrypted password
     */
    encrypt() {
        if (this.encrypted) return this.encrypted;

        if (!this.iv) this.iv = new Buffer.from(crypto.randomBytes(16));
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
        return {...this, encrypted: this.encrypt(), settings: undefined };
    }
}

module.exports = PwManager;
