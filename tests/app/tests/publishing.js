const Request = require('../request');
const Test = require('../test');
const CryptoJS = require('crypto-js');
const db = require(liliumroot + '/includes/db');
const configLib = require(liliumroot + '/config');
const loremipsum = require('lorem-ipsum');

const { createRandomUsers, cleanCollections } = require('../helpers');

class PublicationTest extends Test {
    constructor(logger) {
        super('Publication platform tests', [], logger);
    }

    prepare(then) {
        createRandomUsers([
            { roles : ["author"], displayname : "Authy McAuthor" },
            { roles : ["author", "editor"], displayname : "Edity McEditor" },
            { roles : ["contractor", "contributor"], displayname : "Contry McContributor" }
        ], ([ authorUser, editorUser, contractorUser ]) => {
            this.addTask(new Request("Article create from author").to('POST', '/admin/publishing/new').setPostData({
                headline : loremipsum()
            }).as(authorUser._id).expect((err, r, body) => body && body._id));

            then();
        });
    }

    cleanUp(then) {
        cleanCollections(["entities", "content"], () => then());
    }
}

module.exports = PublicationTest;
