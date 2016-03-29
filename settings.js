var _c = require('./config.js');
var filelogic = require('./filelogic.js');
var fileserver = require('./fileserver.js');
var forms = require('./formBuilder.js');
var hooks = require('./hooks.js');

var Settings = function () {
    this.handleGET = function (cli) {
        cli.touch('settings.handleGET');
        filelogic.serveAdminLML(cli);
    };

    this.handlePOST = function (cli) {
        cli.touch('settings.handlePOST');

        if (cli.hasRight('edit_settings')) {
            var dat = cli.postdata.data;
            delete dat.form_name;

            for (var key in dat) {
                var val = dat[key];
                var keyLevel = key.split('.');
                var nextLevel = cli._c;

                for (var i = 0; i < keyLevel.length - 1; i++) {
                    if (typeof nextLevel[keyLevel[i]] === 'undefined') {
                        nextLevel[keyLevel[i]] = new Object();
                    }

                    nextLevel = nextLevel[keyLevel[i]];
                }

                nextLevel[keyLevel[keyLevel.length - 1]] = val;
            }

            hooks.fire('settings_will_save', cli);
            _c.saveConfigs(cli._c, function () {
                hooks.fire('settings_saved', cli);
                cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?updated=true", false);
            });
        } else {
            cli.throwHTTP(403, 'Unauthorized');
        }
    };

    this.registerForm = function () {
        forms.createForm('settings_form', {
            fieldWrapper: {
                tag: 'div',
                cssPrefix: 'settingsfield-'
            },
            cssClass: 'admin-settings-form'
        })

        .trg('top')
            .add('database-sep', 'title', {
                displayname: "Database"
            })
            .add('data.host', 'text', {
                displayname: "Host"
            })
            .add('data.port', 'text', {
                displayname: "Port"
            })
            .add('data.user', 'text', {
                displayname: "Username"
            })
            .add('data.pass', 'password', {
                displayname: "Password"
            })
            .add('data.use', 'text', {
                displayname: "Database Name"
            })

        .add('paths-sep', 'title', {
                displayname: "Paths"
            })
            .add('paths.admin', 'text', {
                displayname: "Admin"
            })
            .add('paths.login', 'text', {
                displayname: "Login"
            })
            .add('paths.livevars', 'text', {
                displayname: "Live Variables"
            })
            .add('paths.themes', 'text', {
                displayname: "Themes"
            })
            .add('paths.mail', 'text', {
                displayname: "Email"
            })
            .add('paths.themesInfo', 'text', {
                displayname: "Themes info file"
            })
            .add('paths.plugins', 'text', {
                displayname: "Plugins"
            })
            .add('paths.pluginsInfo', 'text', {
                displayname: "Plugins info file"
            })
            .add('paths.uploads', 'text', {
                displayname: "Uploads"
            })

        .add('server-sep', 'title', {
                displayname: "Server"
            })
            .add('server.base', 'text', {
                displayname: "Lilium Root Directory"
            })
            .add('server.html', 'text', {
                displayname: "HTML Directory"
            })
            .add('server.url', 'text', {
                displayname: "Base URL"
            })
            .add('server.port', 'text', {
                displayname: "Port"
            })
            .add('server.postMaxLength', 'number', {
                displayname: "POST Maximum Length"
            })
            .add('server.fileMaxSize', 'number', {
                displayname: "POST Maximum File Size"
            })

        .add('stripe-sep', "title", {
                displayname: "Stripe"
            })
            .add('stripe.publickey', 'text', {
                displayname: "Public Key"
            }, {
                required: false
            })
            .add('stripe.secretkey', 'text', {
                displayname: "Secret Key"
            }, {
                required: false
            })

        .add('email-sep', 'title', {
                displayname: "Email System"
            })
            .add('emails.default', 'text', {
                displayname: "Sender"
            }, {
                required: false
            })
            .trg('bottom')

        .add('dev-sep', 'title', {
                displayname: "Developers"
            })
            .add('env', 'select', {
                displayname: "Environment",
                datasource: [{
                    name: "dev",
                    displayName: "Development"
                }, {
                    name: "prod",
                    displayName: "Production"
                }]
            })

        .add('action-sep', 'title', {
                displayname: "Actions"
            })
            .add('submit', 'submit', {
                displayname: "Save (WIP)"
            });
    };

    this.registerLiveVar = function () {
        require('./livevars.js').registerLiveVariable('settings', function (cli, levels, params, callback) {
            callback(cli._c);
        }, ["admin"]);
    };
};

module.exports = new Settings();