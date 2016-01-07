// var htmlParser = require('./htmlParser');

var form;

var Form = function(name, cb){
  this.name = name;
  this.valid = false;
  this.callback = cb;
  this.fields = {};
};

var Field = function(name, type){

  this.name = name;
  /**
   * Type of the field :
   * text, textarea, button, checkbox, radio, select, option, email, date, number
   * @type {String}
   */
  this.type = type || 'text';

  /**
   * Requirements for the field to be valid
   * @type {Object}
   */
  this.requirements = {
    minLenght: "20",
    maxLenght: "100",
    required: true
  };
}

var FormBuilder = function() {

  this.createFormBuilder = function(name, cb) {
    if (typeof name == 'undefined') {
      throw "[FormBuilderException - No name provided to form";
    }

    form = new Form(name, cb);

    return this;
  }

  this.add = function(name, type, requirements) {

    if (typeof form == 'undefined') {
      throw "[FormBuilderException - Form not created. Please call createFormBuilder() first.";
    }

    if (typeof name == 'undefined') {
      throw "[FormBuilderException - No name provided to field";
    }

    if (typeof form.fields[name] !== 'undefined') {
      throw "[FormBuilderException - Field already added : " + name;
    }

    var field = new Field(name, type);

    for (var key in requirements) {
      field.requirements[key] = requirements[key];
    }

    return this;
  };

  this.getForm = function(cb) {
    return htmlParser.parse(form);
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

      }

      // Minimum lenght verification
      if (field.content.length < requirements['minLenght']) {

      }

      // Maximum lenght verification
      if (field.content.length > requirements['maxLenght']) {

      }

      // Email verification
      if (field.type == 'email' && !validateEmail(field.content)) {}
    }
    return callback(err);
  }
};

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

module.exports = new FormBuilder();
