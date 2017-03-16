const log = require('./log.js');
const hooks = require('./hooks.js');
const db = require('./includes/db.js');
const livevars = require('./livevars.js');
const formBuilder = require('./formBuilder.js');
const filelogic = require('./filelogic.js');
const Admin = require('./backend/admin.js');

class LMLTopics {
    handleLiveVariable(cli, levels, params, send) {
        if (levels[0] == "all") {
            db.findToArray(cli._c, 'topics', {active : true}, (err, topicsArray) => {
                let assoc = {};
                for (var i = 0; i < topicsArray.length; i++) {
                    assoc[topicsArray[i]._id] = topicsArray[i];
                    topicsArray[i].children = [];
                }

                let resp = {};
                let respArray = [];
                for (var i = 0; i < topicsArray.length; i++) {
                    if (topicsArray[i].parent) {
                        assoc[topicsArray[i].parent].children.push(topicsArray[i]);
                    } else {
                        respArray.push(topicsArray[i]);
                    }
                }

                send(respArray);
            });
        } else if (levels[0] == "get") {
            let topicID = levels[1];
            db.findUnique(cli._c, 'topics', {_id : db.mongoID(topicID), active : true}, (err, single) => {
                single ? db.findToArray(cli._c, 'topics', {parent : single._id, active : true}, (cErr, children) => {
                    single.children = children;

                    single.parent ? db.findUnique(cli._c, 'topics', {_id : single.parent}, (err, par) => {
                        single.parent = par;
                        send(single);
                    }) : send(single);
                }) : send();
            });
        } else {
            send(new Error("LivevarException - Undefined first level " + levels[0]));
        }
    }

    handleAdminEndpoint(cli) {
        if (!cli.hasRight('manage-topics')) {
            return cli.throwHTTP(401);
        }

        let firstLevel = cli.routeinfo.path[2];
        if (!firstLevel) {
            filelogic.serveAdminLML(cli);
        } else if (firstLevel == "edit") {
            filelogic.serveAdminLML(cli, true);
        } else {
            cli.throwHTTP(404);
        }
    }

    handleAdminPOST(cli) {
        if (!cli.hasRight('manage-topics')) {
            return cli.throwHTTP(401);
        }

        if (cli.routeinfo.path[2] == "add") {
            let newTopic = cli.postdata.data;

            if (newTopic && newTopic.displayname && newTopic.slug) {
                if (newTopic.parent) {
                    newTopic.parent = db.mongoID(newTopic.parent);
                } else {
                    delete newTopic.parent;
                }

                newTopic.active = true;
                db.insert(cli._c, 'topics', newTopic, () => {
                    cli.sendJSON({
                        created : true,
                        reason : "Valid form"
                    });
                });
            } else {
                cli.sendJSON({
                    created : false,
                    reason : "Missing fields"
                });
            }
        } else {
            cli.throwHTTP(404);
        }
    }

    createForm() {
        require('./formBuilder.js').createForm('topicedit', {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                'id': 'article_new',
                'inner': true
            },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add('topic-details-title', 'title', {
            displayname : "Topic details"
        })
        .add('displayname', 'text', {
            displayname : "Display Name"
        })
        .add('slug', 'text', {
            displayname : "URL slug"
        })
        .add('description', 'textarea', {
            displayname : "Description"
        })
        .trg('top')
        .add('topic-social-title', 'title', { displayname : "Social Networks" })
        .add('facebook', 'text', { displayname : "Facebook Username" }, { required : false })
        .add('twitter', 'text', { displayname : "Twitter Username" }, { required : false })
        .add('googleplus', 'text', { displayname : "Google Plus Username" }, { required : false })
        .add('instagram', 'text', { displayname : "Instagram Username" }, { required : false })
        .add('youtube', 'text', { displayname : "Youtube Channel Name" }, { required : false })
        .trg('bottom')
        .add('topic-action-title', 'title', { displayname : "Actions" })
        .add('publish-set', 'buttonset', { buttons : [{
                'name' : 'save',
                'displayname': 'Save',
                'type' : 'button',
                'classes': ['btn', 'btn-default', 'btn-save']
            }        
        ]})
        .add('children-title', 'title', {
            displayname : "Children"
        })
    }

    setupController() {
        Admin.registerAdminEndpoint('topics', 'GET', this.handleAdminEndpoint);
        Admin.registerAdminEndpoint('topics', 'POST', this.handleAdminPOST);
        livevars.registerLiveVariable('topics', this.handleLiveVariable);
        this.createForm();
    }
}

module.exports = new LMLTopics();
