// Feronia 
// Libraries
const db = require('../includes/db');

const createStaffing = (_c, done) => {
    db.findToArray(_c, "entities", {}, (err, arr) => {
        const allStaff = arr.map(entity => ({
            entityid : entity._id,
            legalname : entity.displayname,
            startdate : entity.welcomedAt || new Date(),
            enddate : null,
            phone : entity.phone || "",
            ssn : "",
            status : entity.revoked ? "terminated" : "active",
            position : "",
            schedule : "",
            rate : 0,
            currency : "cad",
            address : ""
        }));
        
        db.insert(_c, 'staffing', allStaff, () => done());
    });
}

module.exports = (_c, done) => {
    if (_c.default) {
        createStaffing(_c, () => {
            done();
        });
    } else {
        done();
    }
};
