
const db = require('./lib/db.js');

class Duplicate {
    available(_c, collection, selector, send) {
        db.exists(_c, collection, selector, (exists) => {
            send(!exists);
        });
    }

    findAvailable(_c, collection, field, value, send) {
        let testvalue = value;
        let iterator = 0;

        const tryNext = () => {
            db.exists(_c, collection, {[field] : testvalue}, (exists) => {
                if (exists) {
                    iterator++;
                    textvalue = value + "-" + iterator;

                    tryNext();
                } else {
                    send(value);
                }
            });
        };

        tryNext();
    }

    list(_c, collection, field, send) {
        db.join(_c, collection, [
            {"$group"  : { "_id" : "$" + field, "count": { "$sum": 1 } } },
            {"$match"  : { "_id" : { "$ne" : null } , "count" : {"$gt": 1} } }, 
            {"$project": {[field] : "$_id", "_id" : 0} }
        ], (arr) => {
            send(arr);
        });
    }
}

module.exports = new Duplicate();
