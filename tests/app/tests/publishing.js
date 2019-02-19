const Request = require('../request');
const Test = require('../test');
const CryptoJS = require('crypto-js');
const db = require(liliumroot + '/lib/db');
const configLib = require(liliumroot + '/lib/config');
const loremipsum = require('lorem-ipsum');

const { createRandomUsers, cleanCollections, createRandomEdition } = require('../helpers');

class PublicationTest extends Test {
    constructor(logger) {
        super('Publication platform tests', [], logger);
    }

    prepare(then) {
        createRandomUsers([
            { roles : ["author"], displayname : "Authy McAuthor" },
            { roles : ["author", "editor"], displayname : "Edity McEditor" },
            { roles : ["contractor", "contributor"], displayname : "Contributy McContributor" }
        ], ([ authorUser, editorUser, contractorUser ]) => {
            createRandomEdition({}, edition => {
                let authorArticleId;
                let contractorArticleId;

                this.addTask(new Request("Article create from author, should create new entry").to('POST', '/admin/publishing/new').setPostData({
                    headline : loremipsum()
                }).as(authorUser._id).expect((err, r, body) => { authorArticleId = body && body._id; return authorArticleId; }));

                this.addTask(new Request("Article edited by author, should accept edit").to('PUT', () => '/admin/publishing/save/' + authorArticleId).setPostData({
                    title : [loremipsum()],
                    subtitle : [loremipsum()],
                    content : [loremipsum()]
                }).as(authorUser._id).expect((err, r, body) => body && body.historyentry));

                this.addTask(new Request("Article edited by editor, should accept edit").to('PUT', () => '/admin/publishing/save/' + authorArticleId).setPostData({
                    title : [loremipsum()],
                    subtitle : [loremipsum()],
                    content : [loremipsum()]
                }).as(editorUser._id).expect((err, r, body) => body && body.historyentry));

                this.addTask(new Request("Article edited by contractor, should refuse edit").to('PUT', () => '/admin/publishing/save/' + authorArticleId).setPostData({
                    title : [loremipsum()],
                }).as(contractorUser._id).expect((err, r, body) => r.statusCode == 404));

                this.addTask(new Request("Article validated by author, should report missing fields").to('PUT', 
                    () => '/admin/publishing/validate/' + authorArticleId
                ).as(authorUser._id).expect((err, r, body) => r.statusCode == 401));

                this.addTask(new Request("Article edited by author, should help pass validation").to('PUT', () => '/admin/publishing/save/' + authorArticleId).setPostData({
                    editions : [edition._id], media : db.mongoID()
                }).as(authorUser._id).expect((err, r, body) => body && body.historyentry));

                this.addTask(new Request("Article validated by author, should validate fine").to('PUT', 
                    () => '/admin/publishing/validate/' + authorArticleId
                ).as(authorUser._id).expect((err, r, body) => r.statusCode == 200));

                this.addTask(new Request("Article published by author, should generate article").to('PUT', 
                    () => '/admin/publishing/publish/' + authorArticleId
                ).as(authorUser._id).expect((err, r, body) => r.statusCode == 200));

                this.addTask(new Request("About to edit article slug, should change slug and create alias").to('PUT',
                    () => '/admin/publishing/slug/' + authorArticleId
                ).setPostData({ slug : 'new-slug' }).as(editorUser._id).expect((err, r, body) => body && body.url));

                this.addTask(new Request("Contractor creates an article, should allow creation").to('POST', '/admin/publishing/new').setPostData({
                    headline : loremipsum()
                }).as(contractorUser._id).expect((err, r, body) => { contractorArticleId = body && body._id; return contractorArticleId; }));

                this.addTask(new Request("Contractor edits their own article, should allow edit").to('PUT', () => '/admin/publishing/save/' + contractorArticleId).setPostData({
                    title : [loremipsum()], subtitle : [loremipsum()], content : [loremipsum()],
                    editions : [edition._id], media : db.mongoID()
                }).as(contractorUser._id).expect((err, r, body) => body && body.historyentry));
            
                this.addTask(new Request("Contractor sends article for approval, should set new status").to('PUT', 
                    () => '/admin/publishing/submit/' + contractorArticleId
                ).as(contractorUser._id).expect((err, r, body) => body && !body.error));
            
                this.addTask(new Request("Requesting contractor article, should have 'reviewing' status").to('GET', 
                    () => '/livevars/v4/publishing/write/' + contractorArticleId
                ).as(contractorUser._id).expect((err, r, body) => body && body.status == "reviewing" ));
            
                this.addTask(new Request("Unpublishing article, should respond with 200 code").to('DELETE', 
                    () => '/admin/publishing/unpublish/' + authorArticleId
                ).as(authorUser._id).expect((err, r, body) => r.statusCode == 200 ));

                this.addTask(new Request("Destroying author article by contractor, should not allow user to do so").to('DELETE', 
                    () => '/admin/publishing/destroy/' + authorArticleId
                ).as(contractorUser._id).expect((err, r, body) => r.statusCode == 404 ));

                this.addTask(new Request("Destroying author article by original author, should destroy article").to('DELETE', 
                    () => '/admin/publishing/destroy/' + authorArticleId
                ).as(authorUser._id).expect((err, r, body) => r.statusCode == 200 ));

                this.addTask(new Request("Requesting destroyed article, should have 'destroyed' status").to('GET', 
                    () => '/livevars/v4/publishing/write/' + authorArticleId
                ).as(editorUser._id).expect((err, r, body) => body && body.status == "destroyed" ));
            
                then();
            });
        });
    }

    cleanUp(then) {
        cleanCollections(["entities", "content", "editions"], () => then());
    }
}

module.exports = PublicationTest;
