const CryptoJS = require('crypto-js');
const db = require(liliumroot + '/includes/db');
const configLib = require(liliumroot + '/config');

const cleanCollections = (collections, then) => {
    let index = -1;
    const next = () => {
        const col = collections[++index];
        if (col) {
            db.remove(configLib.default(), col, {}, () => next());
        } else {
            then();
        }
    }

    next();
};

const createRandomUsers = (assignations = [], then) => {
    let index = -1;
    const users = [];

    const next = () => {
        const assignation = assignations[++index];
        if (assignation) {
            createRandomUser(assignation, user => {
                users.push(user);
                next();
            });
        } else {
            then(users);
        }
    }

    next();
}

const createRandomUser = (assignation = {}, then) => {
    const pwd = assignation.plaintextpwd || Math.random().toString(16).substring(2);

    const user = Object.assign({
        username : Math.random().toString(16).substring(2),
        plaintextpwd : pwd, shhh : CryptoJS.SHA256(pwd).toString(CryptoJS.enc.Hex),
        displayname : 'Lilium test user #' + Math.random().toString().substring(2),
        roles : [], welcomes : true, sites : [configLib.default().id]
    }, assignation);

    db.insert(configLib.default(), 'entities', user, () => {
        then(user);
    });
}; 

module.exports = { createRandomUsers, cleanCollections };
