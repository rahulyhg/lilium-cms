/**
 * TODO document me!
 * @return {[FormBuilder]} [The FormBuilder as a node module]
 */

var htmlParser = require('./htmlParser');
var validator = require('validator');



var Form = function(name, cb) {
  this.name = name;
  this.valid = false;
  this.callback = cb;
  this.fields = {};

  this.attr = {
    validate: true,
    method: 'post',
    action: '',
    placeholder: false
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
    maxLenght: "-1",
    required: true
  };
}

var FormBuilder = function() {
  var templates = {};
  var forms = {};
  var currentForm = undefined;

  this.createForm = function(name, attr, cb) {

    instanciateForm(name, attr);
    // Add it to the form list
    forms[name] = currentForm;

    return this;
  }

  var instanciateForm = function(name, attr) {
    if (typeof name == 'undefined') {
      throw "[FormBuilderException] - No name provided to form";
    }

    if (typeof forms[name] !== 'undefined') {
      throw "[FormBuilderException] - Form already created : " + name;
    }

    // Instanciate a new form
    currentForm = new Form(name);

    // Update attributes of the form
    for (var key in attr) {
      currentForm.attr[key] = attr[key];
    }
  }

  this.addTemplate = function(name) {
    if (typeof templates[name] == 'undefined') throw "[FormBuilderException] - Template not created. Please call createFormTemplate() first.";
    for (var key in templates[name].fields) {
      var field = templates[name].fields[key]
      this.add(field.name, field.type, field.attr, field.requirements);
    }

    return this;
  }

  this.add = function(name, type, attr, requirements, contextForm) {
    // Check if it is a tempalte
    currentForm = contextForm || currentForm;

    if (typeof currentForm == 'undefined') {
      throw "[FormBuilderException] - Form not created. Please call createForm() first.";
    }
    if (typeof currentForm.fields == 'undefined') {
      currentForm.fields = {};
    }
    if (typeof currentForm.fields[name] !== 'undefined') {
      throw "[FormBuilderException - Field already added : " + name + " with value " + JSON.stringify(currentForm.fields[name]);
    }

    currentForm.fields[name] = createField(name, type, attr, requirements);
    return this;

  };

  this.edit = function(name, type, attr, requirements) {
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
  }

  this.remove = function(name) {
    if (typeof currentForm.fields[name] !== 'undefined') {
      currentForm.fields[name] = undefined;
      delete currentForm.fields[name];
    }
  }

  var createField = function(name, type, attr, requirements) {

    if (typeof name == 'undefined') {
      throw "[FormBuilderException] - No name provided to field";
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
  }

  this.registerFormTemplate = function(name) {
    if (typeof templates[name] !== 'undefined') throw "[FormBuilderException] - Template already created: " + name;
    currentForm = new Object();
    templates[name] = currentForm;

    return this;
  }

  this.unregisterFormTemplate = function(name) {
    if (typeof templates[name] !== 'undefined') {
      templates[name] = undefined;
      delete templates[name];
    }
  }

  this.render = function(formName) {
    if (typeof forms[formName] == 'undefined') {
      throw "[FormBuilderException] - Form to render doesn't exists : " + formName;
    }

    currentForm = forms[formName];

    if (typeof forms[formName].fields['form_name'] == 'undefined') {
      this.add('form_name', 'hidden', {
        value: formName
      }, {
        required: false
      }, forms[formName]);
    }

    return htmlParser.parseForm(forms[formName]);
  }

  /**
   * Validates a form.
   * @param  {Form} form The form object
   * @param  {boolean} withErrStack Whether to return a json error stack or a simple boolean
   * @return {Array}err A stack of all the errors.
   */
  this.validate = function(form, callStack) {
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
      if (requirements.required) {
        if (typeof field.attr !== 'undefined' && field.attr == '') {
          err[field.name] = '001';
        } else if (typeof field.attr == 'undefined') {
          err[field.name] = '001';
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
      if (field.type == 'date' && !validator.isDate(field.attr.value)) {
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
  }

  var isTextBasedField = function(field) {
    var isTextBased = false;
    var type = field.type;

    if (type == 'text' ||
      type == 'email' ||
      type == 'password' ||
      type == 'textarea' ||
      type == 'ckeditor') isTextBased = true;

    return isTextBased;
  }

  /**
   * Handle the cli request and return the form with the values of the request
   * @param  {[type]} cli [description]
   * @return {[type]}     [description]
   */
  this.handleRequest = function(cli) {
    if (typeof cli.postdata !== 'undefined') {

      // Check if it is a file upload
      if (typeof cli.postdata.data !== 'undefined' &&
        typeof cli.postdata.data.form_name == 'undefined' &&
        typeof cli.postdata.uploads !== 'undefined'
      ) {
        return new Form();
      }

      if (typeof cli.postdata.data !== 'undefined' &&
        typeof cli.postdata.data.form_name !== 'undefined' &&
        typeof forms[cli.postdata.data.form_name] !== 'undefined'
      ) {
        var form = JSON.parse(JSON.stringify(forms[cli.postdata.data.form_name]));

        for (var key in cli.postdata.data) {
          if (typeof form.fields[key] !== 'undefined') {
            var escapedData = escape(cli.postdata.data[key]);
            form.fields[key].attr.value = escapedData;
          }

        }
        return form;
      }
    }
  }

  this.serializeForm = function(form) {
    var data = {};
    for (var field in form.fields) {
      var field = form.fields[field];

      var pattern = /(%5C.)/ig;

      field.attr.value = field.attr.value.replace(pattern, '');
      if (field.name != 'form_name') {
        data[field.name] = field.attr.value;
      }
    }

    return data;
  }

  this.deserializeForm = function(serializedForm) {
    // TODO
  }

  this.unescapeForm = function(escapedForm) {
    for (var field in escapedForm) {
      if (typeof escapedForm[field] === 'string') {
        escapedForm[field] = unescape(escapedForm[field]);
      }
    }
    return escapedForm;
  }

  this.isAlreadyCreated = function(name) {
    if (typeof forms[name] == 'undefined') {
      return false;
    }
    return true;
  }

  this.debug = function() {
    console.log(forms);

  }
};

module.exports = new FormBuilder();
