var log = undefined;
var endpoints = undefined;
var hooks = undefined;
var entities = undefined;
var conf = undefined;
var Admin = undefined;
var filelogic = undefined;
var formBuilder = undefined;
var notifications = undefined;
var frontend = undefined;
var sponsoredarticle = require('./sponsoredarticle.js');
var changerequest = require('./changeRequest.js');
var Campaigns = require('./campaigns.js');

var Production = function () {
    this.iface = new Object();

    var initRequires = function (abspath) {
        log = require(abspath + "log.js");
        endpoints = require(abspath + "endpoints.js");
        hooks = require(abspath + "hooks.js");
        entities = require(abspath + "entities.js");
        Admin = require(abspath + 'backend/admin.js');
        filelogic = require(abspath + 'filelogic.js');
        formBuilder = require(abspath + 'formBuilder.js');
        notifications = require(abspath + 'notifications.js');
        frontend = require(abspath + 'frontend.js');
        sponsoredarticle.init(abspath);
    };

    var registerHooks = function () {
        Admin.registerAdminEndpoint('production', 'GET', function (cli) {
            cli.touch("admin.GET.production");
            handleGET(cli);
        });
        Admin.registerAdminEndpoint('production', 'POST', function (cli) {
            cli.touch("admin.POST.production");
            handlePOST(cli);
        });
        Campaigns.registerHooks();
    };

    var initCampaigns = function (asbpath) {
        Campaigns.init(asbpath);

        Admin.registerAdminEndpoint('campaigns', 'GET', function (cli) {
            cli.touch('admin.GET.campaigns');
            Campaigns.handleGET(cli);
        });

        Admin.registerAdminEndpoint('campaigns', 'POST', function (cli) {
            cli.touch('admin.POST.campaigns');
            Campaigns.handlePOST(cli);
        });

        Campaigns.registerLiveVar();

        var aurl = "admin/"; //_c.default().server.url + "/admin/";

        Admin.registerAdminMenu({
            id: "campaigns",
            faicon: "fa-line-chart",
            displayname: "Campaigns",
            priority: 300,
            rights: ["view-campaigns"],
            absURL: aurl + "campaigns",
            children: []
        });

        Campaigns.registerCreationForm();
        Campaigns.loadCampaignsStatuses(function () {});

        // frontend.registerJSFile(abspath + "plugins/production/precomp/js/lmlprodtags.js", 4000, "theme", "all");
    };

    var handleGET = function (cli) {
        switch (cli.routeinfo.path[2]) {
            case undefined:
                filelogic.serveLmlPluginPage('production', cli, false);
                break;
            case 'changerequest':
                changerequest.handleGET(cli);
                break;
            default:
                cli.throwHTTP(404, 'Page not found');

        }
    }

    var handlePOST = function (cli) {
        switch (cli.routeinfo.path[2]) {
            case 'sponsoredcontent':
                sponsoredarticle.createSponsoredContent(cli);
                break;
            case 'changerequest':
                changerequest.handlePOST(cli);
                break;
            default:
                cli.throwHTTP(404, 'Page not found');

        }
    }

    var registerRoles = function () {
        entities.registerRole({
            name: 'production',
            displayname: 'Production'
        }, ['dash', 'production', 'sponsoredcontent', 'view-media',  'view-content'], function () {
            return;
        }, false);
    };

    var registerForms = function () {
        hooks.bind('post_create_bottom', 200, function (pkg) {
            pkg.form
            .add('spons-title', 'title', {
                displayname : "Sponsored Post"
            })
            .add('isSponsored', 'checkbox', {
                displayname: 'Sponsored Content',
            }, {
                required: false
            })
            .add('useSponsoredBox', 'checkbox', {
                displayname: "Display Sponsored Box"
            }, {
                required: false
            })
            .add('sponsoredBoxTitle', 'text', {
                displayname: "Sponsored Box Title"
            }, {
                required: false
            })
            .add('sponsoredBoxURL', 'text', {
                displayname: "Sponsored Box Link"
            }, {
                required: false
            })
            .add('sponsoredBoxLogo', 'media-explorer', {
                displayname: "Sponsored Box Logo",
                wrapper : {
                    tag: 'div',
                    class: 'sponsoredBoxLogoWrapper'
                }
            }, {
                required: false
            })
            .add('sponsoredBoxContent', 'textarea', {
                displayname: "Sponsored Box Context Text"
            }, {
                required: false
            });
        });
    };

    var registerNotificationGroups = function() {
        notifications.createGroup('production', 'production');
    };

    var unregisterHooks = function() {

    };

    var unregisterRoles = function() {

    };

    var unregisterForms = function() {

    };

    var unregisterNotificationGroups = function() {

    };

    this.unregister = function (callback) {
        log("Production", "Plugin disabled");

        callback();
    };

    this.register = function (_c, info, callback) {
        try {
            conf = _c;
            initRequires(_c.default().server.base);
            log("Production", "Initalizing plugin");

            initCampaigns(_c.default().server.base);
            changerequest.init(_c.default().server.base);

            log('Production', 'Registering hooks');
            registerHooks();

            log('Production', 'Registering Roles');
            registerRoles();

            log('Production', 'Registering forms');
            registerForms();
            registerNotificationGroups();

            return callback();
        } catch (e) {
            console.log(e);
        }

    };
};

module.exports = new Production();
