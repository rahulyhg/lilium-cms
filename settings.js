var _c = require('./config.js');
var filelogic = require('./filelogic.js');
var fileserver = require('./fileserver.js');
var forms = require('./formBuilder.js');
var hooks = require('./hooks.js');
var request = require('request');
var dates = require('./dates.js');
var log = require('./log.js');

var Settings = function () {
    this.handleGET = function (cli) {
        cli.touch('settings.handleGET');        
        if (!cli.hasRightOrRefuse("site-admin")) { return; }

        filelogic.serveAdminLML(cli);
    };

    this.handlePOST = function(cli) {
        cli.touch('settings.handlePOST');
        if (cli.hasRight('site-admin')) {
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

    this.registerForm = function () {
        forms.createForm('settings_form', {
            fieldWrapper: {
                tag: 'div',
                cssPrefix: 'settingsfield-'
            },
            cssClass: 'admin-settings-form',
            requirements : {
                required : false
            }
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

        .add('content-sep', 'title', {
                displayname : "Content"
            })
            .add('content.adsperp', 'number', {
                displayname : "Paragraph count between in-content ads"
            })
            .add('contentadsnip', 'stack', {
                displayname : "Ad Code",
                scheme : {
                    columns : [
                        {
                            fieldName : "id",
                            dataType : "text",
                            displayname : "Identifier"
                        }, 
                        {
                            fieldName : "code",
                            dataType : "text",
                            displayname : "Javascript Code"
                        }
                    ]
                }
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
        }).add('facebook_title', 'title', {
            displayname : "Facebook Combos"
        }).add('facebookcombos', 'stack', {
            displayname : "Facebook ID / Token combos",
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
                        fieldName : "token",
                        dataType : "text",
                        displayname : "Access Token"
                    }
                ]
            }
        }).add('twitter_title', 'title', {
            displayname : "Twitter Combos"
        }).add('twittercombos', 'stack', {
            displayname : "Twitter ID / Token combos",
            scheme : {
                columns : [
                    {
                        fieldName : "username",
                        dataType : "text",
                        displayname : "Twitter username"
                    }, {
                        fieldName : "consumerkey",
                        dataType : "text",
                        displayname : "Consumer Key"
                    }, {
                        fieldName : "consumersecret",
                        dataType : "text",
                        displayname : "Consumer Secret"
                    }, {
                        fieldName : "tokenkey",
                        dataType : "text",
                        displayname : "Access Token Key"
                    }, {
                        fieldName : "tokensecret",
                        dataType : "text",
                        displayname : "Access Token Secret"
                    }
                ]
            }
        }).add('instagram_title', 'title', {
            displayname : "Instagram Combos"
        }).add('instagramcombos', 'stack', {
            displayname : "Instagram ID / Token combos",
            scheme : {
                columns : [
                    {
                        fieldName : "account",
                        dataType : "text",
                        displayname : "Account name"
                    }, {
                        fieldName : "clientid",
                        dataType : "text",
                        displayname : "Client ID"
                    }, {
                        fieldName : "clientsecret",
                        dataType : "text",
                        displayname : "Client Secret"
                    }, {
                        fieldName : "accesstoken",
                        dataType : "text",
                        displayname : "Access Token"
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

        .add('social-sep', 'title', {
                displayname: "Social networking"
            })
            .add('social.facebook.appid', 'text', {
                displayname: "Facebook Application ID"
            })
            .add('social.facebook.token', 'text', {
                displayname: "Facebook Public Access Token"
            })
            .add('social.facebook.apiversion', 'text', {
                displayname: "Facebook Graph API Version"
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

    this.registerLiveVar = function () {
        require('./livevars.js').registerLiveVariable('settings', function (cli, levels, params, callback) {
            callback(cli._c);
        }, ["site-admin"]);
    };
};

module.exports = new Settings();
