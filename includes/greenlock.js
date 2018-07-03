const Greenlock = require('greenlock');
const fs = require('fs');
const path = require('path');

class GreenlockWrapper {
    generateCert(_c, done, skipVariation) {
        log('Greenlock', 'Generating HTTPS cert', 'info');
        const curedURL = _c.server.url.substring(2);
        const levels = curedURL.split('.');
        let urlVariation;

        if (levels.length > 2 && levels[0] != "www") {
            skipVariation = true;
        }

        const urlVariation = levels.length > 2 ? levels.splice(1).join('.') : ("www." + levels.join('.'));

        const options = {
            domains : skipVariation ? [curedURL] : [curedURL, urlVariation],
            email : _c.emails.senderemail,
            agreeTos : true,
            skipChallengeTest : true
        }

        const greenlock = Greenlock.create({
            version: 'draft-11',
            server: _c.env == "dev" ? "https://acme-staging-v02.api.letsencrypt.org/directory" : 'https://acme-v02.api.letsencrypt.org/directory',
            webrootPath: _c.server.html + "/.well-known/acme-challenge/",
            skipChallengeTest : true
        });
        
        log('Greenlock', options.domains, 'info');
        greenlock.register(options).then(certs => {
            log('Greenlock', 'Generated cert successfully', 'success');
            log('Greenlock', 'Will expire at ' + certs.expiredAt, 'info');
            // privkey, cert, chain, expiresAt, issuedAt, subject, altnames

            log('Greenlock', 'Writing files to keys directory', 'info');
            fs.writeFileSync(path.join(_c.server.base, '..', 'keys', 'default_fullchain.pem'), `${certs.cert}${certs.chain}`.replace(/\r/g, ''));
            fs.writeFileSync(path.join(_c.server.base, '..', 'keys', 'default_privkey.pem'), certs.privkey);
            log('Greenlock', 'Wrote HTTPS certs in pem files inside keys directory', 'success');

            done(true);
        }, err => {
            log('Greenlock', err.toString(), 'err');
            done(false);
        });
    }
}

module.exports = GreenlockWrapper;