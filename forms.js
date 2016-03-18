var formBuilder = require('./formBuilder.js');

var Forms = function() {
    this.init = function() {
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
            .add('username', 'text', {
                displayname: "Username"
            })
            .add('password', 'password', {
                displayname: "Password"
            })
            .add('firstname', 'text', {
                displayname: "First name"
            })
            .add('lastname', 'text', {
                displayname: "Last name"
            })
            .add('email', 'text', {
                displayname: "Email"
            })
            .add('displayname', 'text', {
                displayname: "Display name"
            })
            .add('roles', 'livevar', {
                endpoint: 'roles',
                tag: 'select',
                template: 'option',
                title: 'role',
                attr: {
                    'multiselect' : true
                },
                props: {
                    'value': 'name',
                    'html': 'displayname',
                    'header': 'Select One',
                },
                displayname: "Initial role"
            })
            .add('create', 'submit');

        formBuilder.registerFormTemplate('category')
            .add('name', 'text', {
                displayname: "Name"
            })
            .add('displayname', 'text', {
                displayname: "Display Name"
            })
            .add('description', 'text', {
                displayname: "Description"
            })

        formBuilder.createForm('category_create')
            .addTemplate('category')
            .add('create', 'submit');

        formBuilder.createForm('category_edit')
            .addTemplate('category')
            .add('update', 'submit');

        formBuilder.registerFieldType('media-explorer', function(field) {
            var displayname = typeof field.attr.displayname !== 'undefined' ? field.attr.displayname : field.name;
            var html = '<div class="media_explorer_form">';
            html += '<input type="hidden" id="media-input" name="' + field.name + '">';
            html += '<div class="actions">';
            html += '<div>' + displayname + '</div>';
            html += '<div class="action-desc">Click to insert image</div>';
            html += '</div>';
            html += '<i class="fa fa-spinner fa-spin" style="display:none"></i>';
            html += '</div>';
            return html;
        });

        formBuilder.registerFormTemplate('media-explorer')
            .add('media', 'media-explorer', {displayname: 'Banner'});

        formBuilder.registerFormTemplate('article_base')
            .add('title', 'text', {
                placeholder: true,
                displayname: 'Title'
            }, {
                minLenght: 3,
                maxLenght: 100
            })
            .add('content', 'ckeditor', {
                nolabel: true
            });

        formBuilder.createForm('media_create', {
                class: []
            })
            .add('File', 'file')
            .add('publish', 'submit', {
                classes: ['lml-button']
            });
    }
};

module.exports = new Forms();
