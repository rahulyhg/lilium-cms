const configLib = require('../lib/config');
const db = require('../lib/db');

const FULL_PROJECTION = {
    legalname : 1, ssn : 1, startdate : 1,
    enddate : 1, status : 1, position : 1,
    schedule : 1, rate : 1, currency : 1,
    address : 1, phone : 1,

    "entity._id" : 1, "entity.displayname" : 1, "entity.avatarURL" : 1,
    "entity.phone" : 1, "entity.username" : 1, "entity.email" : 1, "entity.revoked" : 1,
    "entity.stripeuserid" : 1
};

function terminate(staffid, entityid, done) {
    db.update(configLib.default(), 'staffing', { _id : staffid }, { status : "terminated" }, () => {
        db.update(configLib.default(), 'entities', { _id : entityid }, { revoked : true }, () => {
            done();
        });
    });
}

function restore(staffid, done) {
    db.update(configLib.default(), 'staffing', { _id : db.mongoID(cli.routeinfo.path[3]) }, { status : "active" }, () => {
        done();
    });
}

function update(staffid, field, value, done) {
    db.update(configLib.default(), 'staffing', { _id : db.mongoID(cli.routeinfo.path[3]) }, { [field] : value }, () => {
        done();
    });
}

function getSimple(_id, sendback) {
    db.findUnique(configLib.default(), 'staffing', { _id }, (err, staffinfo = {}) => {
        sendback(err, staffinfo)
    })
}

function getFull($match, sendback) {
    db.join(configLib.default(), 'staffing', [
        { $match },
        { $lookup : { from : 'entities', as : 'entity', localField : 'entityid', foreignField : '_id' } },
        { $project : FULL_PROJECTION },
        { $unwind : "$entity" }
    ], arr => {
        sendback(arr);
    });
}

module.exports = { terminate, restore, update, getSimple, getFull };
