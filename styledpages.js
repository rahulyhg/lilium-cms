const log = require('./log.js');
const db = require('./includes/db.js');
const formBuilder = require('./formBuilder.js');
const tableBuilder = require('./tableBuilder.js');
const Admin = require('./backend/admin.js');
const livevars = require('./livevars.js');

class StyledPages {
    constructor() {

    };

    registerForm() {
        formBuilder.createForm('styledpage_edit', {
            formWrapper: {
                'tag': 'div',
                'class': 'row',
                'id': 'article_new',
                'inner': true
            },
            fieldWrapper : "lmlform-fieldwrapper"
        })
        .add('title', 'text', {
            placeholder : true, 
            displayname : "Styled Page Title",
            classes : ["article_base_title"]
        })
        .add('content', 'ckeditor', {
            nolabel : true
        })
        .add('', 'title', {
            displayname : "Accessing"
        })
        .add('slug', 'text', {
            displayname : "URL slug"
        })
        .add('status', 'select', {

        }
        .add('', 'title', {
            displayname : "Personalize"
        })
        .add('', 'textarea', {
            displayname : "Custom CSS"
        })
        .add('', 'textarea', {
            displayname : "Custom Javascript"
        })
        ;
    }

    registerTable() {
        tableBuilder.createTable({
            name: 'styledpages',
            endpoint: 'styledpages.table',    
            paginate: true,     
            searchable: true, 
            fields : [{
                key: 'title',
                displayname: 'Title',
                template: 'table-sp-title'
            }]
        });
    }

    handleGet(cli) {
        var level = cli.routeinfo.path[2];
        switch (level) {
            case "new":
            case "list":
                require('./filelogic.js').serveAdminLML(cli);
                break;

            case "edit":
                require('./filelogic.js').serveAdminLML(cli, true);
                break;

            case undefined:
            default :
                cli.redirect(cli._c.server.url + "/admin/styledpages/list");
        }
    }

    handlePost(cli) {

    }

    handleLivevar(cli, levels, params, send) {
        send([]);
    }

    registerAdminEndpoint() {
        Admin.registerAdminEndpoint('styledpages', 'GET', this.handleGet);
        Admin.registerAdminEndpoint('styledpages', 'POST',this.handlePost);
    }

    registerLiveVar() {
        livevars.registerLiveVariable('styledpages', this.handleLivevar);
    }
};

module.exports = new StyledPages();

