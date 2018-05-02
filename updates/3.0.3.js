const db = require('../includes/db');

module.exports = (_c, done) => {
    db.find(_c, 'ads', {}, [], (err, cur) => {
        cur.sort({ _id : 1 }).toArray((err, allads) => {
            const langs = {
                en : { content : [], amp : [] },
                fr : { content : [], amp : [] }
            };  

            allads.forEach(x => {
                langs[x.lang][x.type].push({markup : x.markup});
            });

            db.remove(_c, 'ads', {}, () => {
                db.insert(_c, 'ads', [
                    { format : "adset", lang : "en", type : "content", ads : langs.en.content },
                    { format : "adset", lang : "fr", type : "content", ads : langs.fr.content },
                    { format : "adset", lang : "en", type : "amp", ads : langs.en.amp },
                    { format : "adset", lang : "fr", type : "amp", ads : langs.fr.amp }
                ], () => {
                    done();
                });
            });
        });
    });
};
