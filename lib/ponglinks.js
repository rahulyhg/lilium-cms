const db = require('./db');
const sharedcache = require('./sharedcache');
const SHA1 = (str) => require('crypto-js').SHA1(str).toString();

const ALLOWED_EDIT_FIELDS = [
    "destination", "identifier", "status"
];

class PonglinksLib {
    hashDestination(dest) {
        return new Buffer(Date.now().toString()).toString('base64').slice(0, -2);

        // Old logic
        return new Buffer(SHA1(dest)).toString('base64').substring(10);
    }

    parseEditFields(keyval) {
        const edit = {};
        ALLOWED_EDIT_FIELDS.forEach(x => {
            if (keyval[x]) {
                edit[x] = keyval[x];
            }
        });

        return edit;
    }

    /**
     * Checks that all version objects have a hash, if not, attribute a new hash (in place)
     * @param {array} versions Array of version objects
     */
    maybeCreateHash(versions) {
        const nestHash = () => {
            const highest = versions.reduce((a, b) => (a.hash > (b.hash || 0)) ? a : b);
            return (highest && highest.hash) ? highest.hash + 1 : 1000;
        }

        if (versions && versions.length) {
            versions.forEach(version => {
                if (!version.hash) version.hash = nestHash();
            });
        }
    }

 
    editLink(_c, _id, keyval, done) {
        db.update(_c, 'ponglinks', { _id }, this.parseEditFields(keyval), (err, r) => done(err, !!r.modifiedCount));
    }   

    createLink(_c, creatorid, link, done) {
        const hash = this.hashDestination(JSON.stringify(link));
        const versions = link.versions.map((v, i) => {
            v.identifier = v.identifier.trim().replace(/[\s\&]/g, '_');
            if (!v.destination.startsWith('http')) {
                v.destination = "https://" + v.destination.trim();
            }

            return {
                destination : v.destination.trim() + (v.destination.includes("?") ? "&" : "?") +
                    "utm_campaign=" + link.defaults.campaign +
                    "&utm_source=" + link.defaults.source +
                    "&utm_medium=" + v.identifier,
                hash : i + 1000,
                medium : v.identifier
            };
        });

        db.insert(_c, 'ponglinks', {
            creatorid, hash, versions,

            createdOn : new Date(),
            createdAt : Date.now(),

            status : "active", 
            identifier : link.identifier,
            defaults : link.defaults,
            clicks : 0
        }, (err, r) => {
            done(err, r.insertedId);

            const set = {};
            versions.forEach(x => {
                set["ponglinks_" + hash + x.hash] = x.destination;
            });

            sharedcache.set(set, () => {
                done && done();
            });
        });
    }


}

module.exports = new PonglinksLib();
