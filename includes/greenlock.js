const Greenlock = require('greenlock');

class GreenlockWrapper {
    generateCert(_c, done) {
        const curedURL = _c.server.url.substring(2);
        const levels = curedURL.split('.');
        const urlVariation = levels.length > 2 ? levels.splice(1).join('.') : ("www." + levels.join('.'));

        const options = {
            domains : [curedURL, urlVariation],
            email : _c.emails.senderemail,
            agreeTos : true
        }

        const greenlock = Greenlock.create({
            version: 'draft-11',
            server: _c.env == "dev" ? "https://acme-staging-v02.api.letsencrypt.org/directory" : 'https://acme-v02.api.letsencrypt.org/directory',
            webrootPath: _c.server.html
        });
        
        greenlock.register(options).then(certs => {
            log('Greenlock', 'Generated cert successfully', 'success');
            console.log(certs);
            // privkey, cert, chain, expiresAt, issuedAt, subject, altnames
            done(true);
        }, err => {
            log('Greenlock', err.toString(), 'err');
            done(false);
        });
    }

    updateNginx(_c, done) {

    }
}

module.exports = GreenlockWrapper;