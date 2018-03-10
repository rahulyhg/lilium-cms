const filelogic = require('./filelogic');
const contentlib = require('./content');

class ContentController {
    adminGET(cli) {
        // Get LML3 markup
        switch (cli.routeinfo.path[2]) {
            case "list" : cli.hasRightOrRefuse('list-articles') && filelogic.serveAdminLML3(cli); break;
            case "write" : cli.hasRightOrRefuse('create-articles') && filelogic.serveAdminLML3(cli, true); break;
            default : cli.refuse();
        }
    }

    adminPOST(cli) {
        // Create new post

    }

    adminPUT(cli) {
        // Update new post, publish

    }

    adminDELETE(cli) {
        // Unpublish, destroy
        
    }

    livevar(cli, levels, params, sendback) {
        // Get formatted data
        if (levels[0] == "bunch") {
            contentlib.bunch(cli._c, params.filters, params.filters && params.filters.sort, params.max, (params.page - 1) * params.max, sendback);
        } else if (levels[0] == "write") {
            contentlib.getFull(cli._c, levels[1], post => sendback(post));
        } else {
            sendback([]);
        }
    }
};

module.exports = new ContentController();