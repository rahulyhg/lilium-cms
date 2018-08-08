/**
 * TODO document me!
 * @return {[FormBuilder]} [The FormBuilder as a node module]
 */

var validator = require('validator');
var hooks = require('./hooks.js');
var log = require('./log.js');

var Form = function(name, cb) {
    this.name = name;
    this.valid = false;
    this.callback = cb;
    this.fields = {};
    this.requirements = {};

    this.attr = {
        validate: true,
        method: 'post',
        action: '',
        placeholder: false,
        formtag : "form"
    };
};

var Field = function(name, type) {

    this.name = name;
    /**
     * Type of the field :
     * text, textarea, button, checkbox, radio, select, option, email, date, number, ckeditor, file, livevar
     * @type {String}
     */
    this.type = type || 'text';

    this.attr = {
        classes: [],
        value: ''
    };

    /**
     * Requirements for the field to be valid
     * @type {Object}
     */
    this.requirements = {
        minLenght: "0",
        maxLenght: "",
        required: true
    };
};

var FormBuilder = function() {
    var templates = {};
    var forms = {};
    var currentForm = undefined;
    var registerFilename;
    var that = this;

    this.createForm = function(name, attr, cb, auto) {
        instanciateForm(name, attr, auto);
        // Add it to the form list
        forms[name] = currentForm;

        log('FormBuilder', 'Initialized form with name ' + name, 'success');
        return this;
    };

    var instanciateForm = function(name, attr, auto) {
        if (typeof name == 'undefined') {
            throw new Error("[FormBuilderException] - No name provided to form");
        }
        if (!auto) {
            if (typeof forms[name] !== 'undefined') {
                var err = new Error("[FormBuilderException] - Form already created : " + name);
                log('FormBuilder', err, 'warn');
                return;
            }
        }

        // Instanciate a new form
        currentForm = new Form(name);

        // Update attributes of the form
        for (var key in attr) {
            currentForm.attr[key] = attr[key];
        }
    };

    this.addTemplate = function(name, auto) {
        if (typeof templates[name] == 'undefined') {
            var err = new Error ( "[FormBuilderException] - Template not created. Please call createFormTemplate() first.");
            log('FormBuilder', err, 'warn');
            return this;
         }
        for (var key in templates[name].fields) {
            var field = templates[name].fields[key]
            this.add(field.name, field.type, field.attr, field.requirements, undefined, true);
        }

        return this;
    };

    this.form = function(name) {
        currentForm = forms[name];
        return this;
    };

    this.registerFieldType = function(name, fct) {
    };

    this.beginSection = function(sectionName, conditions) {
        conditions = conditions || {};
        conditions.sectionname = sectionName;
        conditions.nowrap = true;
        return this.add('lmlsection-' + sectionName, 'lmlsection', conditions);
    };

    this.closeSection = function(sectionName) {
        return this.add('lmlclosure-' + sectionName, 'lmlclosure', { 
            sectionname : sectionName,
            nowrap : true
        });
    };

    this.add = function(name, type, attr, requirements, contextForm, auto) {
        return this;
    };

    this.trigger = this.trg = function(sectionname, auto) {
        log('FormBuilder', 'Trigger on form with section name ' + sectionname, 'detail');
        if (!auto) {
            registerFilename = __caller;
        }

        var that = this;
        hooks.trigger(currentForm.name + "_" + sectionname, {
            form: that
        });
        return this;
    };

    this.edit = function(name, type, attr, requirements, auto) {
        if (typeof currentForm.fields[name] !== 'undefined') {
            var field = currentForm.fields[name];
            if (typeof type !== 'undefined' && type != '') {
                field.type = type;
            }

            // Update attributes
            for (var key in attr) {
                field.attr[key] = attr[key];
            }
            // Update requirements
            for (var key in requirements) {
                field.requirements[key] = requirements[key];
            }
        }
        return this;
    };

    this.remove = function(name) {
        log('FormBuilder', 'Attempt to remove field with name ' + name, 'info');
        if (typeof currentForm.fields[name] !== 'undefined') {
            currentForm.fields[name] = undefined;
            delete currentForm.fields[name];

            log('FormBuilder', 'Removed field with name ' + name, 'success');
        }
        return this;
    };

    this.deleteForm = function(name) {
        log('FormBuilder', 'Attempt to delete form with name ' + name, 'info');
        if (typeof forms[name] !== 'undefined') {
            forms[name] = undefined;
            delete forms[name];
        }
    }

    var createField = function(name, type, attr, requirements) {
        if (typeof name == 'undefined') {
            throw new Error("[FormBuilderException] - No name provided to field");
        }

        // Instanciate a new field
        var field = new Field(name, type);

        // Update attributes
        for (var key in attr) {
            field.attr[key] = attr[key];
        }

        // Update requirements
        for (var key in requirements) {
            field.requirements[key] = requirements[key];
        }

        return field;
    };

    this.registerFormTemplate = function(name, auto) {
        if (typeof templates[name] !== 'undefined') {
            var err = new Error( "[FormBuilderException] - Template already created: " + name );
            log('FormBuilder', err, 'warn');
            return this;
        }
        currentForm = new Object();
        templates[name] = currentForm;

        return this;
    };

    this.unregisterFormTemplate = function(name) {
        if (typeof templates[name] !== 'undefined') {
            templates[name] = undefined;
            delete templates[name];
        }
    };

    this.debug = function() {
        console.log(forms);
    };

    this.render = function(formName, formContext, filledBy) {
        log('FormBuilder', 'DEPRECATED call to .render', 'warn');
        return;

        /*
        log('FormBuilder', 'Rendering form with name : ' + formName, 'info');
        if (typeof forms[formName] === 'undefined') {
            log('FormBuilder', 'Tried to render undefined form with name : ' + formName, 'err');
            throw new Error("[FormBuilderException] - Form to render doesn't exists : " + formName);
        }

        currentForm = forms[formName];

        if (typeof forms[formName].fields['form_name'] == 'undefined') {
            this.add('form_name', 'hidden', {
                value: formName
            }, {
                required: false
            }, forms[formName]);
        }
        */
    };

    /**
     * Validates a form.
     * @param  {Form} form The form object
     * @param  {boolean} withErrStack Whether to return a json error stack or a simple boolean
     * @return {Array}err A stack of all the errors.
     */
    this.validate = function(form, callStack, cli) {
        log('FormBuilder', 'DEPRECATED call to .validate', 'warn');
        return true;

        var valid = false;
        // Return an error stack by default
        if (typeof callStack == 'undefined') {
            callStack = true;
        }

        if (typeof form == 'undefined') {
            return false;
        }
        var err = {};

        for (var field in form.fields) {
            var field = form.fields[field];
            var requirements = field.requirements;
            // Required verification
            if (requirements && requirements.required) {
                if (typeof field.attr !== 'undefined' && field.attr == '') {
                    err[field.name] = '001';
                } else if (typeof field.attr == 'undefined') {
                    err[field.name] = '001';
                }
            }

            // Check for roles
            if (typeof field.attr.data !== 'undefined' && field.attr.data.right && typeof cli !== 'undefined') {
                if (!cli.isGranted(field.attr.data.right)) {
                    err[field.name] = '010';
                }
            }

            // If it is a text based field e.g. text, password, email etc..
            if (isTextBasedField(field)) {

                // Minimum lenght verification
                if (field.attr.value.length < requirements['minLenght']) {
                    err[field.name] = '002';
                }

                // Maximum lenght verification
                if (requirements['maxLenght'] > 0 && field.attr.value.length > requirements['maxLenght']) {
                    err[field.name] = '003';
                }

            }

            // Email verification
            if (field.type == 'email' && !validator.isEmail(field.attr.value)) {
                err[field.name] = '004';
            }

            // Date verification
            if (false && field.type == 'date' && !validator.isDate(field.attr.value)) {
                err[field.name] = '005';
            }

            // Number verification
            if (field.type == 'number') {
                if (validator.isNumeric(field.attr.value)) {
                    if (field.attr.value > requirements['max']) {
                        err[field.name] = '006';
                    } else if (field.attr.value < requirements['min']) {
                        err[field.name] = '007';
                    }
                } else {
                    err[field.name] = '008';
                }

            }

            // Checkbox verification
            if (field.type == 'checkbox' && requirements['required'] && field.attr.value != 'on') {
                err[field.name] = '009';
            }

        }

        form.valid = valid = Object.keys(err).length == 0 ? true : false;
        // Return
        if (callStack) {
            return valid ? {
                success: true
            } : err;
        } else {
            return valid;
        }
    };

    var isTextBasedField = function(field) {
        var isTextBased = false;
        var type = field.type;

        if (type == 'text' ||
            type == 'email' ||
            type == 'password' ||
            type == 'textarea' ||
            type == 'ckeditor') isTextBased = true;

        return isTextBased;
    };

    /**
     * Handle the cli request and return the form with the values of the request
     * @param  {[type]} cli [description]
     * @return {[type]}     [description]
     */
    this.handleRequest = function(cli) {
        log('FormBuilder', 'DEPRECATED call to .handleRequest', 'warn');
        return cli.postdata.data;

        if (typeof cli.postdata !== 'undefined') {
            if (typeof cli.postdata.data !== 'undefined' &&
                typeof cli.postdata.data.form_name !== 'undefined' &&
                typeof forms[cli.postdata.data.form_name] !== 'undefined'
            ) {
                var form = JSON.parse(JSON.stringify(forms[cli.postdata.data.form_name]));

                for (var key in cli.postdata.data) {
                    if (typeof form.fields[key] !== 'undefined') {
                        //Keep object for files type
                        if (form.fields[key].type == 'form') {
                            form.fields[key].attr.value = cli.postdata.data[key];
                        } else {
                            var escapedData;
                            if (typeof cli.postdata.data[key] == 'string') {
                                escapedData = cli.postdata.data[key].replace(/\\r/g, "\r").replace(/\\n/g, "\n").replace(/\\/g, "");
                            } else {
                                escapedData = cli.postdata.data[key];
                            }

                            form.fields[key].attr.value = escapedData;

                            if (form.fields[key].type == "map") {
                                form.fields[key + "display"] = {
                                    attr : {
                                        value : cli.postdata.data[key + "display"]
                                    },
                                    name : key + "display"
                                };
                            }
                        }
                    } //else {
                        // form.field[key] = {
                        //     type : 'unknown',
                        //     name : key,
                        //     attr : {
                        //         value : cli.postdata.data[key]
                        //     },
                        //     requirements : {}
                        // };
                    // }
                }

                return form;
            }
        }
    };

    this.serializeForm = function(form) {
        var data = {};
        for (var field in form.fields) {
            var field = form.fields[field];

            if (field.name != 'form_name' && field.type != 'button') {
                data[field.name] = field.attr.value;
            }
        }
        return data;
    };

    this.deserializeForm = function(serializedForm) {
        // TODO
    };

    this.unescapeForm = function(escapedForm) {
        for (var field in escapedForm) {
            if (typeof escapedForm[field] === 'string') {
                escapedForm[field] = unescape(escapedForm[field]);
            }
        }
        return escapedForm;
    };

    this.isAlreadyCreated = function(name) {
        if (typeof forms[name] == 'undefined') {
            return false;
        }
        return true;
    };

    this.debug = function() {
        return forms;
    };

    this.init = function() { };
};

module.exports = new FormBuilder();
