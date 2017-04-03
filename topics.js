const log = require('./log.js');
const hooks = require('./hooks.js');
const db = require('./includes/db.js');
const livevars = require('./livevars.js');
const formBuilder = require('./formBuilder.js');
const filelogic = require('./filelogic.js');
const Admin = require('./backend/admin.js');

class LMLTopics {
    livevar(cli, levels, params, send) {
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

    adminGET(cli) {
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

    adminPOST(cli) {
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
                db.insert(cli._c, 'topics', newTopic, (err, r) => {
                    this.updateFamily(cli._c, newTopic._id, newTopic.slug, () => {
                        cli.sendJSON({
                            created : true,
                            reason : "Valid form"
                        });
                    });
                });
            } else {
                cli.sendJSON({
                    created : false,
                    reason : "Missing fields"
                });
            }
        } else if (cli.routeinfo.path[2] == "edit") {
            let updatedTopic = cli.postdata.data;
            let topicID = db.mongoID(cli.routeinfo.path[3]);
            
            if (updatedTopic && updatedTopic.displayname && updatedTopic.slug && topicID) {
                db.update(cli._c, 'topics', {_id : topicID}, updatedTopic, (() => {
                    this.updateFamily(cli._c, topicID, updatedTopic.slug, () => {
                        cli.sendJSON({
                            updated : true,
                            reason : "Valid form"
                        });
                    });
                }).bind(this));
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

    serveOrFallback(cli, fallback) {
        const that = this;
        let completeSlug = cli.routeinfo.fullpath;
        let maybeIndex = completeSlug.split('/');
        if (!isNaN(maybeIndex[maybeIndex.length - 1])) {
            let realIndex = maybeIndex.pop();
            completeSlug = maybeIndex.join('/');
            
            maybeIndex = realIndex;
        } else {
            maybeIndex = 0;
        }

        db.findUnique(cli._c, 'topics', {completeSlug : completeSlug}, (err, topic) => {
            if (err || !topic) {
                fallback();
            } else {
                if (require('./endpoints.js').contextualIsRegistered(cli._c.id, 'topic', 'GET')) {
                    require('./endpoints.js').executeContextual('topic', 'GET', cli, {
                        topic : topic, 
                        index : maybeIndex
                    });
                } else {
                    let template = topic.archivetemplate || "topic";
                    require('./filelogic.js').renderThemeLML(cli, template, completeSlug + ".html", {}, (content) => {
                        cli.response.writeHead(200);
                        cli.response.end(content);
                    });
                }
            }
        });
    }

    refreshTopicsSlugs(conf, done) {
        const that = this;
        db.findToArray(conf, 'topics', {}, (err, arr) => {
            let index = -1;
            const next = () => {
                index++;
                if (index == arr.length) {
                    done();
                } else {
                    that.updateFamily(conf, arr[index]._id, arr[index].slug, next);
                }
            };      
            next();
        }, {_id : 1, slug : 1});
    }

    updateFamily(conf, _id, newSlug, callback) {
        const getParentArray = (parentobject, done) => {
            let pArray = [];
            
            const request = () => {
                if (parentobject.parent) {
                    db.findUnique(conf, 'topics', {_id : parentobject.parent}, (err, par) => {
                        pArray.push(par.slug);
                        parentobject = par;
                        request();
                    });
                } else {
                    done(pArray);
                }
            };
            
            request();
        };

        const affectChildren = (childid, parentSlug, done) => {
            db.findUnique(conf, 'topics', {_id : childid}, (err, topic) => {
                parentSlug = parentSlug + "/" + topic.slug;
                db.update(conf, 'topics', {_id : childid}, {completeSlug : parentSlug}, () => {
                    // Find children, recur
                    db.findToArray(conf, 'topics', {parent : childid}, (err, array) => {
                        let childIndex = -1;
                        const nextChild = () => {
                            childIndex++;
                            if (array.length == childIndex) {
                                done();
                            } else {
                                affectChildren(array[childIndex]._id, parentSlug, nextChild);
                            }
                        };

                        nextChild();
                    });
                });
            });
        };

        db.findUnique(conf, 'topics', {_id : _id}, (err, topic) => {
            getParentArray(topic, (parentArray) => {
                let parentSlug = parentArray.reverse().join('/');
                affectChildren(_id, parentSlug, () => {
                    callback();
                });
            });
        });
    }

    form() {
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
        .add('frontend-title', 'title', { displayname : "Templates" })
        .add('articletemplate', 'liveselect', {
            endpoint : "themes.templates.article",
            select : {
                value : 'file',
                displayname : 'displayname'
            },
            empty : {
                displayname : " - Default template - "
            },
            displayname : "Article template"
        })
        .add('archivetemplate', 'liveselect', {
            endpoint : "themes.templates.archive",
            select : {
                value : 'file',
                displayname : 'displayname'
            },
            empty : {
                displayname : " - Default template - "
            },
            displayname : "Archive template"
        })
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
}

module.exports = new LMLTopics();
