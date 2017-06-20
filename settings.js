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
                hooks.fire('settings_will_save', cli);

                _c.saveConfigs(cli._c, function () {
                    hooks.fire('settings_saved', cli);
                    cli.redirect(cli._c.server.url + cli.routeinfo.relsitepath + "?updated=true", false);
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
            .add('google.clientid', 'text', {
                displayname: "Client ID"
            })
            .add('google.clientsecret', 'text', {
                displayname: "Client Secret"
            })
            .add('google.redirecturl', 'text', {
                displayname: "Redirect URL"
            })
            .add('google.accesstoken', 'text', {
                displayname : "Access Token"
            })
            .add('google.refreshtoken', 'text', {
                displayname : "Refresh Token"
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
            .add('analytics.siteviewid', 'text', {
                displayname: "Site view ID"
            })

        .add('lickstats_title', 'title', {
            displayname : "Lickstats Combos"
        })
        .add('lickstatscombos', 'stack', {
            displayname : "Lickstats ID / Secret combo",
            scheme : {
                columns : [
                    {
                        fieldName : "websiteurl",
                        dataType : "text",
                        displayname : "Website URL"
                    }, {
                        fieldName : "id",
                        dataType : "text",
                        displayname : "Account ID"
                    }, {
                        fieldName : "secret",
                        dataType : "text",
                        displayname : "Access Secret"
                    }
                ]
            }
        }).add('dfp_title', 'title', {
                displayname: "DFP"
            })
            .add('dfp.client_id', 'text', {
                displayname: "Client ID"
            }, {
                required: false
            })
            .add('dfp.client_secret', 'text', {
                displayname: "Client Secret"
            }, {
                required: false
            })
            .add('dfp.redirect_url', 'text', {
                displayname: "Redirect URL"
            }, {
                required: false
            })
            .add('dfp.scope', 'text', {
                displayname: "Scope"
            }, {
                required: false
            })
            .add('dfp.code', 'text', {
                displayname: "Code"
            }, {
                required: false
            })
            .add('dfp.access_token', 'text', {
                displayname: "Access Token"
            }, {
                required: false
            })
            .add('dfp.refresh_token', 'text', {
                displayname: "Refresh Token"
            }, {
                required: false
            })
            .add('dfp.version', 'text', {
                displayname: "API Version"
            }, {
                required: false
            })
            .add('dfp.network_code', 'text', {
                displayname: "Network Code"
            }, {
                required: false
            })
            .add('dfp.app_name', 'text', {
                displayname: "DFP App Name"
            }, {
                required: false
            })
            .add('dfp.fan', 'text', {
                displayname: "In-content Facebook Audiance Network Placement ID"
            }, {
                required: false
            })
            .add('dfp-incontentprop', 'stack', {
                displayname : "In-content DFP tags",
                scheme : {
                    columns : [
                        {
                            fieldName : "tagid",
                            dataType : "text",
                            displayname : "DFP Tag ID"
                        }, {
                            fieldName : "sizes",
                            dataType : "text",
                            displayname : "Sizes (2D array)"
                        }, {
                            fieldName : "htmlid",
                            dataType : "text",
                            displayname : "HTML ID"
                        }
                    ]
                }
            }, {
                required: false
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
/*            .add('posts.frontend.dateformat', 'text', {
                displayname: "Presented date format"
            }, {
                required: false
            })
*/

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

    this.livevar = function(cli, levels, params, callback) {
        callback(cli._c);
    }
};

module.exports = new Settings();
