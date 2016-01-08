/**
 * HtmlParser is a parser for various javascript objects.
 * @return {HtmlParser} [The HtmlParser as a node module]
 */
var HtmlParser = function() {
  this.parseForm = function(form) {
    var htmlForm = '';

    if (typeof form == 'undefined') {
      throw "[HtmlParser - No form provided to parse";
    }

    // Form tag generation
    htmlForm = '<form ';

    // Name
    htmlForm += form.name ? "name='" + form.name + "' " : "";

    // Method
    htmlForm += form.attr.method ? "method='" + form.attr.method + "' " : "";

    // Action
    htmlForm += form.attr.action ? "action='" + form.attr.action + "' " : "";
    htmlForm += '/>';

    //Generate fields
    for (var index in form.fields) {
      field = form.fields[index];

      // Generate the field label if it's not a checkbox, a radio, button, submit
      if (field.type != 'checkbox' &&
        field.type != 'radio' &&
        field.type != 'button' &&
        field.type != 'submit') {

        htmlForm += (!form.attr.placeholder && field.name) ? '\n<label for="' + field.name + '">' + field.name + '</label>' : '\n';
      }

      // Check whether it's a "Simple" input type or a  more "Complex" one
      if (field.type == 'text' ||
        field.type == 'password' ||
        field.type == 'email' ||
        field.type == 'checkbox') {

        htmlForm += parseSimpleFormType(field, form.attr.placeholder);
      } else {
        switch (field.type) {
          case 'button':
            htmlForm += parseButtonType(field);
            break;
          case 'submit':
            htmlForm += parseSubmitType(field);
            break;
          case 'textarea':
            htmlForm += parseTextAreaType(field);
        }
      }

      // Generate the field label if it's a checkbox nor a radio
      if (field.type == 'checkbox' || field.type == 'radio') {
        htmlForm += (!form.attr.placeholder && field.name) ? '<label for="' + field.name + '">' + field.name + '</label>' : '';
      }
      htmlForm += '<br>'
    }

    // Close form tag
    htmlForm += "\n</form>";
    return htmlForm;
  }

  var parseSimpleFormType = function(field, hasPlaceholder) {
    var input = '<input type="' + field.type + '" ';
    input += parseBasicFieldAttributes(field);

    // Placeholder
    input += (hasPlaceholder && field.name) ? 'placeholder="' + field.name + '"' : '';

    // MinLenght
    input += field.requirements.minLenght ? 'data-minLength="' + field.requirements.minLenght + '"' : '';

    // MaxLenght
    input += field.requirements.maxLenght ? 'data-maxLength="' + field.requirements.maxLenght + '"' : '';

    // That's all folks!
    input += ' />'

    return input;
  }


  var parseButtonType = function(field) {
    var input = '<button ';
    input += parseBasicFieldAttributes(field);
    input += '></button>';
    return input;
  }

  var parseCheckBoxType = function(field) {
    var input = '<input type="checkbox" ';
    input += parseBasicFieldAttributes(field);
    input += ' />';
    return input;
  }

  var parseTextAreaType = function(field) {
    var input = '<textarea ';
    input += parseBasicFieldAttributes(field);
    // Rows
    input += field.attr.rows ? 'rows="'+ field.attr.rows +'"' : '';
    // Cols
    input += field.attr.cols ? 'cols="'+ field.attr.cols +'"' : '';

    input += ' >';
    input += field.attr.value ? field.attr.value : '';
    input += '</textarea>'
    return input;
  }

  var parseSubmitType = function(field) {
    var input = '<input type="submit" ';
    input += field.attr.value ? 'value="' + field.attr.value + '" ' : ' value="' + field.name + '" ';
    input += '/>'
    return input;
  }

  var parseBasicFieldAttributes = function(field) {
    var attributes = '';
    // Name
    attributes += field.name ? 'name="' + field.name + '" ' : '';

    // ID
    attributes += field.attr.id ? 'id="' + field.attr.id + '" ' : '';

    // Value
    attributes += field.attr.value ? 'value="' + field.attr.value + '" ' : '';

    // Is required?
    attributes += field.requirements.required ? ' required ' : '';

    // Classes
    attributes += 'class="v_validate ' + parseClasses(field) + '" ';
    return attributes;
  }

  var parseClasses = function(field) {
    var classHtml = '';
    if (typeof field.attr.classes !== 'undefined') {
      for (var index in field.attr.classes) {
        classHtml += '' + field.attr.classes[index] + ', ';
      }
    }
    return classHtml;
  }
}

module.exports = new HtmlParser();
