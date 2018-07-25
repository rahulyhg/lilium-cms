var _c = require('./config.js');
var filelogic = require('./filelogic.js');
var fileserver = require('./fileserver.js');
var forms = require('./formBuilder.js');
var hooks = require('./hooks.js');
var request = require('request');
var dates = require('./dates.js');
var log = require('./log.js');

var Settings = function () {
    this.adminGET = function (cli) {
        cli.touch('settings.handleGET');        
        if (!cli.hasRightOrRefuse("admin")) { return; }

        filelogic.serveAdminLML(cli);
    };

    this.adminPOST = function(cli) {
        cli.touch('settings.handlePOST');
        if (cli.hasRight('admin')) {
            var dat = cli.postdata.data;
            delete dat.form_name;
            delete dat[""];
            delete dat[undefined];

            for (var field in dat) {
                cli._c[field] = dat[field];
            }

            var saveSetts = function() {
                hooks.fireSite(cli._c, 'settings_will_save', {settings : dat, _c : cli._c});

                _c.saveConfigs(cli._c, function () {
                    cli.sendJSON({ settings : dat, ok : 1 });

                    setTimeout(() =>{
                        process.send("updateAndRestart", () => {});
                    }, 100);
                });
            };

            if (cli._c.google.apikey) {
                log('Settings', 'Requesting timezone from Google');
                dates.getTimezoneInfo(cli._c, dat.timezoneplace.split('_').reverse().join(','), function(result) {
                    var offset = result.rawOffset / 3600;
                    cli._c.timezone = result.timeZoneId;

                    log('Settings', 'Timezone returned for location (' + 
                        dat.timezoneplace.split('_').reverse().join(',') + 
                        ') is ' + cli._c.timezone
                    );

                    saveSetts();
                });
            } else {
                log('Settings', 'Saving without Google API key');
                saveSetts();
            }
        } else {
            cli.throwHTTP(403, 'Unauthorized');
        }
    };

    this.form = function () {
        forms.createForm('settings_form', {
            fieldWrapper: {
                tag: 'div',
                cssPrefix: 'settingsfield-'
            },
            cssClass: 'admin-settings-form',
            requirements : {
                required : false
            },
            async : true,
            json : true
        })

        .trg('top')
        .add('website-sep', 'title', {
            displayname : "Website"
        })
            .add('website.sitetitle', 'text', {
                displayname : "Public title"
            })
            .add('website.catchline', 'text', {
                displayname : "Catch line"
            })
            .add('website.language', 'select', {
                displayname : "Language",
                datasource : [
                    {displayName : "Canadian English", name : "en-ca"},
                    {displayName : "American English", name : "en-us"},
                    {displayName : "Français Canadien", name : "fr-ca"},
                    {displayName : "Français de France", name : "fr-fr"}
                ]
            })

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

        .add('server-sep', 'title', {
                displayname: "Server"
            })
            .add('server.base', 'text', {
                displayname: "Lilium Root Directory"
            })
            .add('server.html', 'text', {
                displayname: "HTML Directory"
            })
            .add('server.protocol', 'text', {
                displayname : "Protocol",
                defaultValue : "http:"
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

        .add('content-cdn-sep', 'title', {
                displayname : "Content Delivery Network"
            })
            .add('content.cdn.domain', 'text', {
                displayname : "CDN Domain"
            })
            .add('content.cdn.company', 'text', {
                displayname : "Company Alias"
            })
            .add('content.cdn.key', 'text', {
                displayname : "Consumer Key"
            })
            .add('content.cdn.secret', 'text', {
                displayname : "Consumer Secret"
            })

        .add('google-sep', 'title', {
                displayname: "Google API"
            })
            .add('google.apikey', 'text', {
                displayname: "API Key"
            })
            .add('google.jsonfilepath', 'text', {
                displayname : "Backend JSON key file full path"
            })

        .add('analytics-api-title', 'title', {
                displayname: "Analytics API"
            })
            .add('analytics.serviceaccount', 'text', {
                displayname: "Service account email"
            })
            .add('analytics.jsonkeypath', 'text', {
                displayname: "JSON key file root path"
            })
            .add('analytics.accountid', 'text', {
                displayname: "Account ID"
            })
            .add('analytics.siteviewid', 'text', {
                displayname: "Site view ID"
            })
        .add('social-facebook-sep', 'title', {
                displayname: "Facebook API"
            })
            .add('social.facebook.appid', 'text', {
                displayname: "Facebook Application ID"
            })
            .add('social.facebook.token', 'text', {
                displayname: "Facebook Public Access Token"
            })
            .add('social.facebook.privtoken', 'text', {
                displayname: "Facebook Private Token"
            })
            .add('social.facebook.apiversion', 'text', {
                displayname: "Facebook Graph API Version"
            })
        .add('social-instagram-sep', 'title', {
            displayname : "Instagram API"
        })
            .add('social.instagram.accounts', 'text', {
                displayname : "Instagram accounts"
            })
        .add('email-sep', 'title', {
                displayname: "Email System"
            })
            .add('emails.senderemail', 'text', {
                displayname: "Sender Email"
            }, {
                required: false
            })
            .add('emails.senderpass', 'password', {
                displayname : "Sender Password"
            }, {
                required : false
            })
            .add('emails.senderfrom', 'text', {
                displayname : "Sender Name"
            }, {
                required : false
            })
        .add('login-sep', 'title', {
                displayname: "Login screen"
            })
            .add('login.wallpaper', 'text', {
                displayname: "Login Wallpaper"
            }, {
                required: false
            })

        .add('post-sep', 'title', {
                displayname: "Date / Time"
            })
            .add('posts.backend.dateformat', 'text', {
                displayname: "Post list date format"
            }, {
                required: false
            })
        .add('tz-sep', 'title', {
                displayname: "Timezone"
            })
            .add('timezoneplace', 'map', {
                notitle: true,
                format : "array"
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
                    name: "output",
                    displayName: "Full output"
                }, {
                    name: "prod",
                    displayName: "Production"
                }]
            })

        .add('action-sep', 'title', {
                displayname: "Actions"
            })
        .add("actions", 'buttonset', {
            buttons : [
                {
                    name : "save",
                    displayname : "Save and Restart Lilium",
                    type : "button",
                    classes : ["btn-save"]
                }
            ]
        })
    };

    this.livevar = function(cli, levels, params, callback) {
        callback(cli._c);
    }
};

module.exports = new Settings();
