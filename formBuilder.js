/**
 * TODO document me!
 * @return {[FormBuilder]} [The FormBuilder as a node module]
 */

var htmlParser = require('./htmlParser');

var forms = {};

var Form = function(name, cb){
  this.name = name;
  this.valid = false;
  this.callback = cb;
  this.fields = {};

  this.attr = {
    method: 'post',
    action: '',
    placeholder: false
  };
};

var Field = function(name, type){

  this.name = name;
  /**
   * Type of the field :
   * text, textarea, button, checkbox, radio, select, option, email, date, number
   * @type {String}
   */
  this.type = type || 'text';

  this.attr = {
    classes : [],
    value : ''
  };

  /**
   * Requirements for the field to be valid
   * @type {Object}
   */
  this.requirements = {
    minLenght: "0",
    maxLenght: "-1",
    required: false
  };
}

var FormBuilder = function() {
  this.currentForm;

  this.createForm = function(name, attr, cb) {
    if (typeof name == 'undefined') {
      throw "[FormBuilderException - No name provided to form";
    }

    if (typeof forms[name] !== 'undefined') {
      throw "[FormBuilderException - Form already created : " + name;
    }

    // Instanciate a new form
    currentForm = new Form(name, cb);

    // Update attributes of the form
    for (var key in attr) {
      currentForm.attr[key] = attr[key];
    }

    // Add it to the form list
    forms[name] = currentForm;

    return this;
  }

  this.add = function(name, type, attr, requirements) {

    if (typeof currentForm == 'undefined') {
      throw "[FormBuilderException - Form not created. Please call createForm() first.";
    }

    if (typeof name == 'undefined') {
      throw "[FormBuilderException - No name provided to field";
    }

    if (typeof currentForm.fields[name] !== 'undefined') {
      throw "[FormBuilderException - Field already added : " + name;
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

    currentForm.fields[name] = field;
    return this;
  };

  this.render = function(formName) {
    if (typeof forms[formName] == 'undefined') {
      throw "[FormBuilderException - Form to render doesn't exists : " + formName;
    }

    return htmlParser.parseForm(forms[formName]);
  }

  this.validate = function(requirements) {
    if (typeof form == 'undefined') {
      throw "[FormBuilderException - Form not created. Please call createFormBuilder() first.";
    }

    var err = {};

    for (var field in form.fields) {
      var requirements = field.requirements;

      // Required verification
      if ((typeof field.content !== 'undefined' || field.content == '') && field.requirements.required) {
        err[field.name] = 'This field is required';
      }

      // Minimum lenght verification
      if (field.content.length < requirements['minLenght']) {
        err[field.name] = 'This field is to short';
      }

      // Maximum lenght verification
      if (requirements['maxLenght'] > 0 && field.content.length > requirements['maxLenght']) {
        err[field.name] = 'This field is to long';
      }

      // Email verification
      if (field.type == 'email' && !validateEmail(field.content)) {
        err[field.name] = 'This field is not an email';
      }

    }
    return callback(err);
  }
  this.debug = function(){
    console.log(forms);

  }
};

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

module.exports = new FormBuilder();
