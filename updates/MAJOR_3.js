// Libraries
const db = require('../includes/db');

// Call stack
const remodalPonglinks = (_c, done) => {
    const doOne = cur => {
        cur.hasNext((err, hasnext) => {
            hasnext ? cur.next((err, link) => {
                // Set current settings as default value for versions
                link.defaults = {
                    destination : link.destination,
                    source : link.source,
                    campaign : link.campaign, 
                    medium : link.medium
                };

                // Map string versions with objects using default values
                link.versions = link.versions.map((v, i) => {
                    return {
                        hash : 1000 + i,
                        use_default : true,
                        destination : link.defaults.destination,
                        name : v
                    };
                });

                // Avoid reallocating old fields in new format
                delete link.destination;
                delete link.source;
                delete link.campaign;
                delete link.medium;

                // Unset old values, set new values
                log('MAJOR3', "Updating ponglink " + link.identifier + " on site " + _c.website.sitetitle, 'info');
                db.update(_c, 'ponglinks', { _id : link._id }, { $unset : {
                    destination : 1, source : 1, campaign : 1, medium : 1
                }, $set : link }, () => {
                    // Keep the show going until done
                    setTimeout(() => doOne(cur), 0);
                }, false, true, true);
            }) : done();
        });
    };
    
    db.find(_c, 'ponglinks', {}, [], (err, cur) => {
        doOne(cur);
    });
};

// Exported update function
module.exports = (_c, done) => {
    remodalPonglinks(_c, done);
};
