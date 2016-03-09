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

        formBuilder.registerFormTemplate('article_base')
            .add('title', 'text', {
                placeholder : true,
                displayname : 'Title'
            }, {
                minLenght: 3,
                maxLenght: 100
            })
            .add('content', 'ckeditor', {
                nolabel : true
            })
    }
};

module.exports = new Forms();
