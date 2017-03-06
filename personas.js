var log = require('./log.js');
var admin = require('./backend/admin.js');
var livevars = require('./livevars.js');
var filelogic = require('./filelogic.js');
var db = require('./includes/db.js');
var forms = require('./formBuilder.js');
var imageResizer = require('./imageResizer.js');

var Personas = function() {};

Personas.prototype.handleGET = function(cli) {
    if (cli.routeinfo.path.length < 3) {
        cli.redirect(cli._c.server.url + cli.routeinfo.fullpath + "/list", true);
    } else {
        switch (cli.routeinfo.path[2]) {
            case "list":
            case "new":
                filelogic.serveAdminLML(cli);
                break;
            case "edit":
                filelogic.serveAdminLML(cli, true);
                break;
            default:
                cli.throwHTTP(404, 'NOT FOUND');
        }
    }
};

Personas.prototype.handlePOST = function(cli) {
    switch (cli.routeinfo.path[2]) {
        case "new":
            handleSave(cli);
            break;
        case "edit":
            handleSave(cli, true, cli.routeinfo.path[3]);
        default:
            cli.throwHTTP(404, 'NOT FOUND');
    }
};

Personas.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('personas', function(cli, levels, params, cb) {
        if (levels[0] === "list") {
            db.findToArray(cli._c, 'personas', {}, function(err, arr) {
                cb(err || arr);
            });
        } else if (levels[0] == "get") {
            var id = levels[1];
            db.findToArray(cli._c, 'personas', {_id : db.mongoID(id)}, function(err, arr) {
                cb(err || arr[0]);
            });
        }
    });
};

Personas.prototype.registerForms = function() {
    forms.createForm('persona_create', {
        fieldWrapper : "lmlform-fieldwrapper"
    })
    .add('title-info', 'title', {
        displayname : "Personal information"
    })
    .add('fullname', 'text', {
        displayname : "Full name"
    })
    .add('age', 'number', {
        displayname : "Age"
    })
    .add('fromcity', 'text', {
        displayname : "Place of birth (city)"
    })
    .add('currentcity', 'text', {
        displayname : "Current city"
    })
    .add('title-life', 'title', {
        displayname : "Life"
    })
    .add('presentation', 'textarea', {
        displayname : "Presentation paragraph"
    })
    .add('job', 'text', {
        displayname : "Current job / Field of study"
    })
    .add('title-intests', 'title', {
        displayname : "Interests"
    })
    .add('hottopics', 'text', {
        displayname : "Hot topics (comma-separated)"
    })
    .add('negativetopics', 'text', {
        displayname : "Negative topics (comma-separated)"
    })
    .add('tone', 'text', {
        displayname : "Preferred tone (i.e. cynical, bubbly, bold)"
    })
    .add('titleexemple', 'text', {
         displayname : "Title this person would click on (just one)"
    })
    .add('title-picture', 'title', {
        displayname : "Looks"
    })   
    .add('pictureid', 'media-explorer', {
        displayname : "Profile picture",
        size: 250,
        urlfield : "pictureurl"
    })

    .add('Save', 'submit', {
        displayname : "Save"
    });
};

Personas.prototype.bindHooks = function() {
    require('./hooks.js').bind('post_create_persona', 15, function(pkg) {
        pkg.form.add('persona-select', 'liveselect', {
            displayname : "Persona",
            endpoint: 'personas.list', 
            select : {
                value : '_id',
                displayname : 'fullname'
            },
            empty : {
                displayname : "- No persona -"
            }
        });
    });
};

var handleSave = function(cli, update, updateid) {
    var form = forms.handleRequest(cli);  
    var response = forms.validate(form, true);  

    if (response.success) {
        var fields = forms.serializeForm(form);

        db.findToArray(cli._c, 'uploads', {_id : db.mongoID(fields.pictureid)}, function(err, arr) {
            var newobj = {
                fullname : fields.fullname,
                age : fields.age,
                fromcity : fields.fromcity,
                currentcity : fields.currentcity,
                presentation : fields.presentation,
                job : fields.job,
                hottopics : fields.hottopics,
                negativetopics : fields.negativetopics,
                tone : fields.tone,
                titleexemple : fields.titleexemple,
                pictureid : fields.pictureid,
                pictureurl : arr.length == 0 ? "" : arr[0].sizes.thumbnailarchive.url
            };

            if (update) {
                db.update(cli._c, 'personas', {_id : db.mongoID(updateid)}, newobj, function() {
                    cli.redirect(cli._c.server.url + "/admin/persona/", false);
                });
            } else {
                db.insert(cli._c, 'personas', newobj, function() {
                    cli.redirect(cli._c.server.url + "/admin/persona/", false);
                });
            }
        });
    } else {
        cli.sendJSON({ 
            msg: response 
        });
    }
};

module.exports = new Personas();
