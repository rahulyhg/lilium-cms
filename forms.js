var formBuilder = require('./formBuilder.js');
var log = require('./log.js');

var Forms = function() {
    this.init = function() {
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
            .add('create', 'submit');

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
