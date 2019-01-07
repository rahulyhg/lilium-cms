const crypto = require('crypto');
const AESEncryptor = require('./aesencryptor');
const _c = require('./config.js');
const db = require('./includes/db');
const binList = require('./backend/static/creditBIN.json');

const ccCol = 'creditcards';

class CreditCardManager {
    constructor() {
        this.aesEncryptor = new AESEncryptor({});
        this.ENCRYPTEDFIELDS = ['number', 'cvc'];
    }

    getCreditCards(done) {
        db.findToArray(_c.default(), ccCol, {}, (err, data) => {
            data.forEach(card => {
                this.ENCRYPTEDFIELDS.forEach(fieldName => {
                    card[fieldName] = this.aesEncryptor.decryptAES(card[fieldName], card.iv.buffer);
                });

                card.iv = undefined;
            });

            console.log(data);;
            
            done && done(err, data);
        });
    }

    createCreditCard(number, expiryMonth, expiryYear, cvc, currency, isDefault, done) {
        const isCurrencyDefault = !!isDefault;
        const newCC = { number, expiryMonth, expiryYear, cvc, currency, isCurrencyDefault };
        const iv = new Buffer.from(crypto.randomBytes(16));
        
        const info = this.getCCIssuerInfo(number.substring(0, 6));
        if (info) {
            newCC.scheme = info.scheme;
            newCC.bank = info.bank_name;
        }

        this.ENCRYPTEDFIELDS.forEach(fieldName => {
            newCC[fieldName] = this.aesEncryptor.encryptAES(newCC[fieldName], iv);
        });
        
        newCC.iv = iv;

        db.insert(_c.default(), ccCol, newCC, done);
    }

    updateCreditCard(id, ops, done) {
        const toCipher = Object.keys(ops).filter(key => this.ENCRYPTEDFIELDS.includes(key));
        // Only make DB request if card iv is necessary to cipher fields
        if (toCipher.length) {
            db.findUnique(_c.default(), ccCol, { _id: db.mongoID(id) }, (err, card) => {
                if (!err && card) {
                    toCipher.forEach(fieldName => {
                        ops[fieldName] = this.aesEncryptor.encryptAES(ops[fieldName], card.iv.buffer);
                    });
                    
                    delete ops._id;
                    db.update(_c.default(), ccCol, { _id: db.mongoID(id) }, ops, done);
                } else {
                    done && done(err);
                }
            });
        } else {
            db.update(_c.default(), ccCol, { _id: db.mongoID(id) }, ops, done);
        }
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
