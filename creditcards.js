const crypto = require('crypto');
const _c = require('./config.js');
const db = require('./includes/db');
const binList = require('./backend/static/creditBIN.json');

const ccCol = 'creditcards';

class CreditCardManager {
    constructor() {
        // Encryption settings
        this.ALGORITHM = 'aes256';
        this.INPUTENCODING = 'utf8';
        this.OUTPUTENCODING = 'hex';
        this.KEY = _c.default().signature.privatehash.substring(0, 32);
        this.ENCRYPTEDFIELDS = ['number'];
    }

    /**
     * Encrypts a card entity (in place)
     * @param {object} card The card object to encrypt
     * @return an object containing the encrypted data AND the initialization vector used to encrypt the data
     */
    encryptAES(card) {
        const iv = new Buffer.from(crypto.randomBytes(16));
        console.log(this.KEY);
        
        this.ENCRYPTEDFIELDS.forEach(fieldName => {
            const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
            let crypted = cipher.update(card[fieldName], this.INPUTENCODING, this.OUTPUTENCODING);
            crypted = cipher.final(this.OUTPUTENCODING);

            card[fieldName] = crypted;
        });

        card.iv= iv;

        return card;
    }

    /**
     * Decrypts the encryed fields of a credit card (in place)
     * @param {object} card the card entity to decrypt
     */
    decryptAES(card) {
        if (!card.iv) throw "Cannot decipher a credit card entity that has no iv";
        console.log(this.KEY);
        
        
        this.ENCRYPTEDFIELDS.forEach(fieldName => {
            console.log(card.iv.buffer);
            console.log(card[fieldName]);
                        
            const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, card.iv.buffer);
            let decrypted = decipher.update(card[fieldName], this.OUTPUTENCODING, this.INPUTENCODING);
            decrypted += decipher.final(this.INPUTENCODING);

            card[fieldName] = decrypted;
        });

        return card;
    }

    getCreditCards(done) {
        db.findToArray(_c.default(), ccCol, {}, (err, data) => {
            // const deciphered = [];
            // data.forEach(card => {
            //     deciphered.push(this.decryptAES(card));
            // })
            done && done(err, data);
        });
    }

    createCreditCard(number, expiryMonth, expiryYear, cvc, done) {
        const newCC = { number, expiryMonth, expiryYear, cvc };
        // console.log(newCC);
        // const ciphered = this.encryptAES(newCC);
        // console.log(ciphered);

        // db.insert(_c.default(), ccCol, ciphered, done);
        db.insert(_c.default(), ccCol, newCC, done);
    }

    updateCreditCard(id, ops, done) {
        db.update(_c.default(), ccCol, { _id: db.mongoID(id) }, ops, done);
    }

    deleteCreditCard(id, done) {
        db.remove(_c.default(), ccCol, { _id: db.mongoID(id) }, done);
    }

    /**
     * Returns a credit card's issuer information based on the IIN number
     * @param {string} digits The first 4 digits of the credit card number to identify
     * @return Object containing credit card information
     */
    getCCIssuerInfo(digits) {
        return binList.find(x => x.iin_start == digits);
    }
}

module.exports = new CreditCardManager();
