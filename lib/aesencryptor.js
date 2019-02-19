const crypto = require('crypto');
const _c = require('../lib/config');

module.exports = class AESEncryptor {

    /**
     * Instantiates an AES encryptor
     * @param {object} settings Settings for password encryption / decryption
     * @param {string} settings.inputEncoding Encoding of the plaintext
     * @param {string} settings.outputEncoding Encoding of the ciphered password} settings
     * @param {string} settings.key Key used for encryption
     */
    constructor(settings) {
        this.ALGORITHM = 'aes256';
        this.INPUTENCODING = settings.inputEncoding || 'utf8';
        this.OUTPUTENCODING = settings.outputEncoding || 'hex';
        this.KEY = settings.key || _c.default().signature.privatehash.substring(0, 32);
    }

    /**
     * Encrypts a string using the AES algorithm and the provided settings
     * @param {string} data The data to encrypt
     * @param {buffer} iv The buffer initialization vector used to encrypt AND decrypt the data
     * @return The encrypted data
     */
    encryptAES(data, iv) {
        if (!iv) throw "Cannot cipher data without an iv";
        
        const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
        let crypted = cipher.update(data, this.INPUTENCODING, this.OUTPUTENCODING);
        crypted += cipher.final(this.OUTPUTENCODING);

        return crypted;
    }

    /**
     * Decipheres a ciphered string using the AES algorithm and the provided settings
     * @param {string} data The data to encrypt
     * @param {buffer} iv The buffer initialization vector used to encrypt AND decrypt the data
     * @return The deciphered data
     */
    decryptAES(data, iv) {
        if (!iv) throw "Cannot decipher data without an iv";
        
        const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);
        let decrypted = decipher.update(data, this.OUTPUTENCODING, this.INPUTENCODING);
        decrypted += decipher.final(this.INPUTENCODING);

        return decrypted;
    }
}
