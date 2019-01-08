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

        if (isCurrencyDefault) {
            this.resetCurrencyDefaults((err, r) => {
                if (!err) {
                    db.insert(_c.default(), ccCol, newCC, done);
                } else {
                    done && done(err);
                }
            })
        } else {
            db.insert(_c.default(), ccCol, newCC, done);
        }
    }

    updateCreditCard(id, ops, done) {
        const toCipher = Object.keys(ops).filter(key => this.ENCRYPTEDFIELDS.includes(key));
        // Only make DB request if card iv is necessary to cipher fields
        if (toCipher.length) {
            db.findUnique(_c.default(), ccCol, { _id: db.mongoID(id) }, (err, card) => {
                if (!err && card) {
                    const cipherUpdate = () => {
                        toCipher.forEach(fieldName => {
                            ops[fieldName] = this.aesEncryptor.encryptAES(ops[fieldName], card.iv.buffer);
                        });
    
                        delete ops._id;
    
                        db.update(_c.default(), ccCol, { _id: db.mongoID(id) }, ops, done);
                    }

                    if (ops.isCurrencyDefault) {
                        this.resetCurrencyDefaults(card.currency, err => {
                            if (err) return done && done(err);
                            cipherUpdate()
                        });
                    } else {
                        cipherUpdate();
                    }
                } else {
                    done && done(err);
                }
            });
        } else {
            db.update(_c.default(), ccCol, { _id: db.mongoID(id) }, ops, done);
        }
    }

    /**
     * Explicitly sets the 'isCurrencyDefault' property for all the cards of the specified currency.
     * @param {object} currency The currency for which to reset the defaults
     */
    resetCurrencyDefaults(currency, done) {
        if (currency) {
            db.update(_c.default(), ccCol, { currency }, { isCurrencyDefault: false }, (err, r) => {
                done && done(err, r);
            });
        } else {
            done && done('Cannot reset isCurrencyDefault property for am undefined currency');
        }
    }

    /**
     * Returns the default credit card for the given currency, if any. If non is found, returns undefined
     * @param {string} currency The currency for which to get the default card
     * @param {callback} done Executed when the database request completes
     */
    getDefaultCardByCurrency(currency, done) {
        this.getCreditCards((err, cards) => {
            const cur = currency.toUpperCase();
            const defaultCard = cards.find(c => c.isCurrencyDefault && c.currency == cur);

            done && done(defaultCard);
        });
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
