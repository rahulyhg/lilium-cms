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
        default:
            cli.throwHTTP(404, 'NOT FOUND');
    }
};

Personas.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('personas', function(cli, levels, params, cb) {
        db.findToArray(cli._c, 'personas', {}, function(err, arr) {
            cb(err || arr);
        });
    });
};

Personas.prototype.registerForms = function() {
    forms.createForm('persona_create', {
        fieldWrapper : "lmlform-fieldwrapper"
    })
    .add('title-info', 'title', {
        displayname : "Personal information"
    })
    .add('personafullname', 'text', {
        displayname : "Full name"
    })
    .add('personaage', 'number', {
        displayname : "Age"
    })
    .add('personacityfrom', 'text', {
        displayname : "Place of birth (city)"
    })
    .add('personacitycurrent', 'text', {
        displayname : "Current city"
    })
    .add('title-life', 'title', {
        displayname : "Life"
    })
    .add('personapresentation', 'textarea', {
        displayname : "Presentation paragraph"
    })
    .add('personajob', 'text', {
        displayname : "Current job / Field of study"
    })
    .add('title-intests', 'title', {
        displayname : "Interests"
    })
    .add('personahottopics', 'text', {
        displayname : "Hot topics (comma-separated)"
    })
    .add('personanegativetopics', 'text', {
        displayname : "Negative topics (comma-separated)"
    })
    .add('personatone', 'text', {
        displayname : "Preferred tone (i.e. cynical, bubbly, bold)"
    })
    .add('personaexemple', 'text', {
         displayname : "Title this person would click on (just one)"
    })
    .add('title-picture', 'title', {
        displayname : "Looks"
    })   
    .add('personapicture', 'file', {
        displayname : "Profile picture"
    })

    .add('Save', 'submit', {
        displayname : "Save"
    }) 
};

var handleSave = function(cli) {
    var form = forms.handleRequest(cli);  
    var response = forms.validate(form, true);  

    if (response.success) {
        form.personepicture;

        var fields = forms.serializeForm(form);
        var extensions = fields.personapicture.split('.'); 
        var mime = extensions[extensions.length - 1]; 
        var saveTo = cli._c.server.base + "backend/static/uploads/" + fields.personapicture;

        imageResizer.resize(saveTo, fields.personapicture, mime, cli._c, function (images) { 
            db.insert(cli._c, 'personas', {
                fullname : fields.personafullname,
                age : fields.personaage,
                fromcity : fields.personacityfrom,
                currentcity : fields.personacitycurrent,
                persentation : fields.personapresentation,
                job : fields.personajob,
                hottopics : fields.personahottopics,
                negativetopics : fields.personanegativetopics,
                tone : fields.personatone,
                titleexemple : fields.exemple,
                pictureurl : images.thumbnailarchive.url
            }, function() {
                cli.redirect(cli._c.server.url + "/admin/persona", false);
            });
        });
    } else {
        cli.sendJSON({ 
            msg: response 
        });
    }
};

module.exports = new Personas();
