const crypto = require('crypto');
const _c =require('config');
const db = require('./includes/db');

class PwManager {
    constructor() {
        // AES256 key length is 32 Octets
        this.KEY = _c.default().privatehash.substring(0, 32);
        this.inputEncoding = 'utf8';
        this.outputEncoding = 'hex';
    }

    createCategory() {

    }


}

/**
 * ENtity that holds multiple passwords and requires a particular role to access.
 */
class Category {
    /**
     * Instanciates a Category object
     * @param {string} name Name of the category to be created
     * @param {string} role name of the role required
     */
    constructor(name, role) {

    }

    /**
     * Sets the role necessary to access the category
     * @param role name of the role
     */
    setRole(role) {
        
    }
}

class Password {
    /**
     * Creates a new instance of Password
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
    }

    getEncrypted(settings) {
        if (this.encrypted) return this.encrypted;

        this.iv = new Buffer.from(crypto.randomBytes(16));
        const cipher = crypto.createCipheriv(settings.algorithm, settings.key, this.iv);
        let crypted = cipher.update(this.plaintext, settings.inputEncoding, settings.outputEncoding);
        crypted += cipher.final(settings.outputEncoding);

        this.encrypted = crypted.toString();
        return this.encrypted;
    }

    getPlaintext(settings) {
        const decipher = crypto.createDecipheriv(settings.algorithm, settings.key, this.iv);
        let decrypted = decipher.update(this.encrypted, settings.outputEncoding, settings.inputEncoding);
        decrypted += decipher.final(settings.inputEncoding);

        return decrypted.toString();
    }

    setPlaintext(plaintext) {
        this.plaintext = plaintext;
        this.encrypted = this.iv = undefined;
    }
}

/**
 * Endpoints:
 * 
 *      GET /categories
 *      GET /categories/{categoryId}
 *      GET /categories/{categoryId}/passwords
 * 
 *      POST /categories
 *      POST /categories/{categoryId}/passwords
 * 
 *      PUT /categories/{categoryId}
 *      PUT /categories/{categoryId}/passwords/{passwordId}
 * 
 *      DELETE /categories/{categoryId}
 *      DELETE /categories/{categoryId}/passwords/{passwordId}
 */
class PwManagerController {
    livevar(cli, levels, params, sendback) {
        console.log(levels);
        
        if (levels[0] == 'categories') {
            
            sendback({categories: []});
        }
    }

    adminPOST(cli) {
        cli.sendJSON({endpoint: 'POST /pwmanager'})
    }

    adminPUT(cli) {
        cli.sendJSON({endpoint: 'PUT /pwmanager'})

    }

    adminDELETE(cli) {
        cli.sendJSON({endpoint: 'DELETE /pwmanager'})

    }
}

module.exports = new PwManagerController();
