var formBuilder = require('./formBuilder.js');
var log = require('./log.js');

var Forms = function () {
    this.init = function () {
        log('Forms', 'Initializing default forms');
        formBuilder.registerFormTemplate('payment')
            .add('nameoncard', 'text', {
                displayname: "Name on card",
                data: {
                    stripe: "name"
                }
            }, {
                required: false
            })
            .add('creaditCard', 'text', {
                displayname: "Card Number",
                data: {
                    stripe: "number"
                }
            }, {
                required: false
            })
            .add('cvc', 'text', {
                displayname: "CVC",
                data: {
                    stripe: "cvc"
                }
            }, {
                required: false
            })
            .add('month', 'text', {
                displayname: "Expiration month (MM)",
                data: {
                    stripe: "exp-month"
                }
            }, {
                required: false
            })
            .add('year', 'text', {
                displayname: "Expiration year (YYYY)",
                data: {
                    stripe: "exp-year"
                }
            }, {
                required: false
            });

        formBuilder.registerFormTemplate('entity_create')
            .add('creds-info-title', 'title', {
                displayname : "Credentials"
            })
            .add('username', 'text', {
                displayname: "Username"
            })
            .add('password', 'password', {
                displayname: "Password"
            }, {required:false})
            .add('public-info-title', 'title', {
                displayname : "User information"
            })
            .add('firstname', 'text', {
                displayname: "First name"
            }, {required:false})
            .add('lastname', 'text', {
                displayname: "Last name"
            }, {required:false})
            .add('email', 'text', {
                displayname: "Email"
            })
            .add('phone', 'text', {
                displayname: "Phone"
            })
            .add('displayname', 'text', {
                displayname: "Display name"
            })
            .add('jobtitle', 'text', {displayname : "Job title"}, {required:false})
            .add('description', 'textarea', {displayname: 'BIO'}, {required:false})
            .add('create', 'submit');

        formBuilder.registerFormTemplate('entity_social')
            .add('social-title', 'title', {
                displayname: "Social networks"
            })
            .add('socialnetworks.facebook', 'text', {
                displayname: "Facebook"
            })
            .add('socialnetworks.twitter', 'text', {
                displayname: "Twitter"
            })
            .add('socialnetworks.googleplus', 'text', {
                displayname: "Google Plus"
            })
            .add('socialnetworks.instagram', 'text', {
                displayname: "Instagram"
            })

        formBuilder.registerFormTemplate('entity_rights')            
            .add('roles', 'livevar', {
                endpoint: 'roles',
                tag: 'select',
                template: 'option',
                title: 'role',
                attr: {
                    'lmlselect' : true,
                    'multiple': true
                },
                props: {
                    'value': 'name',
                    'html': 'displayname',
                    'header': 'Select One',
                },
                displayname: "Initial roles"
            })
            .add('sites', 'livevar', {
                endpoint: "sites.all.simple",
                tag: 'select',
                template : 'option',
                title : 'sites',
                attr : {
                    lmlselect : true,
                    multiple : true
                },
                props : {
                    value : 'id',
                    html : 'displayName',
                    header : 'Select Multiple'
                },
                displayname : "Website access"
            })
 

        formBuilder.registerFormTemplate('category')
            .add('name', 'text', {
                displayname: "Name"
            })
            .add('displayname', 'text', {
                displayname: "Display Name"
            }, {
                required : false
            })
            .add('description', 'text', {
                displayname: "Description"
            }, {
                required : false
            })

        formBuilder.createForm('ckimagecredit', {
                fieldWrapper : {
                    tag: 'div',
                    cssPrefix : 'ck-image-credit-field-'
                },
                cssClass : "ck-image-credit-form"
            })
            .add('ckimagecreditname', 'text', {
                displayname: "Artist name",
                tabindex: 0
                }, 
            {
                required : false
            })
            .add('ckimagecrediturl', 'text', {
                displayname: "URL to artist page",
                tabindex: 0
            }, {
                required : false
            });

        formBuilder.createForm('category_create', {
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .addTemplate('category')
            .add('create', 'submit');

        formBuilder.createForm('category_edit', {
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .addTemplate('category')
            .add('update', 'submit');

        formBuilder.registerFieldType('media-explorer', function (field) {
            var displayname = typeof field.attr.displayname !== 'undefined' ? field.attr.displayname : field.name;
            var html = '<label for="'+field.name+'">' + displayname + '</label>';
            html += '<div>';
            html += '<img class="media_explorer_form pickable" data-hiddenfield="'+field.name+'"';
            html += (field.attr.size ? ('style="width: '+field.attr.size+'px; height: '+field.attr.size+'px;" ') : '') + ' />';
            html += '<input type="hidden" class="media-input" name="' + field.name + '">';
            html += '</div>';
            return html;
        });

        formBuilder.registerFormTemplate('media-explorer')
            .add('media', 'media-explorer', {
                displayname: 'Banner'
            });

        formBuilder.registerFormTemplate('article_base')
            .add('title', 'text', {
                placeholder: true,
                displayname: 'Title',
                classes : ["article_base_title"]
            }, {
                minLenght: 3,
                maxLenght: 200
            })
            .add('subtitle', 'text', {
                placeholder: true,
                displayname: 'Subtitle',
                classes : ["article_base_subtitle"]
            }, {
                minLenght: 3,
                maxLenght: 200
            })
            .add('content', 'ckeditor', {
                nolabel: true
            });

        formBuilder.createForm('media_create', {
                class: [],
                fieldWrapper : "lmlform-fieldwrapper"
            })
            .add('File', 'file')
            .add('publish', 'submit', {
                classes: ['lml-button']
            });
    }
};

module.exports = new Forms();
