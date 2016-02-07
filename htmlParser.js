/**
 * HtmlParser is a parser for various javascript objects.
 * @return {HtmlParser} [The HtmlParser as a node module]
 */
var HtmlParser = function() {
  this.parseForm = function(form) {
    var htmlForm = '';
    var submitButton = '';
    if (typeof form == 'undefined') {
      throw "[HtmlParser - No form provided to parse";
    }

    // Form tag generation
    htmlForm = '<form ';

    if (form.attr.validate) {
      htmlForm += 'class="v_form_validate '+(form.attr.cssClass || "")+'" ';
    }

    // Name
    htmlForm += form.name ? "name='" + form.name + "' " : "";

    //id
    htmlForm += form.attr.id ? "id='" + form.attr.id  + "' " : "";

    // Method
    htmlForm += form.attr.method ? "method='" + form.attr.method.toUpperCase() + "' " : "POST";

    // Action
    htmlForm += form.attr.action ? "action='" + form.attr.action + "' " : "";
    if (form.attr.method == 'post') {
      htmlForm += ' enctype="multipart/form-data" ';
    }
    htmlForm += '/>';

    var hasFieldWrapper = typeof form.attr.fieldWrapper !== "undefined";

    //Generate fields
    for (var index in form.fields) {
      field = form.fields[index];

      if (hasFieldWrapper) {
        htmlForm += '<' + (form.attr.fieldWrapper.tag || 'div') + 
          ' class="' + (field.attr.wrapperCssPrefix || form.attr.fieldWrapper.cssPrefix || "field-") + 
          (field.attr.wrapperCssSuffix || field.type) + 
          '">';
      }

      // Check whether it's a "Simple" input type or a  more "Complex" one
      if (field.type == 'text' ||
        field.type == 'password' ||
        field.type == 'email') {
        htmlForm += parseSimpleFormType(field, field.attr.placeholder || form.attr.placeholder);
      } else if (field.type == 'submit') {
        submitButton = parseSubmitType(field);
      } else {
        switch (field.type) {
          case 'button':
            htmlForm += parseButtonType(field, form.attr.placeholder);
            break;
          case 'textarea':
            htmlForm += parseTextAreaType(field, form.attr.placeholder);
            break;
          case 'number' :
            htmlForm += parseNumberType(field, form.attr.placeholder);
            break;
          case 'hidden' :
          htmlForm += parseHiddenType(field);
          break;
          case 'checkbox' :
            htmlForm += parseCheckBoxType(field, form.attr.placeholder);
            break;
          case 'ckeditor' :
            htmlForm += parseTextAreaType(field,form.attr.placeholder);
            break;
          case 'file' :
            htmlForm += parseFileType(field);
            break;
          case 'livevar' :
            htmlForm += parseLiveVar(field);
            break;
        }
        htmlForm += '<br>'

      }
      
      if (hasFieldWrapper) {
        htmlForm += "</" + (form.attr.fieldWrapper.tag || "div") + ">";
      }

      htmlForm += form.attr.afterField || "";
    }

    //Insert submit form
    htmlForm += submitButton;
    htmlForm += '<br>'

    // Close form tag
    htmlForm += "\n</form>";
    return htmlForm;
  }

  var generateLabel = function(field, placeholder) {
    var label = '<label ';
    var text = field.attr.displayname || field.name;

    // Never generate label for those
    if (field.type == 'button' || field.type == 'submit' || field.type == 'hidden') {
      return '';
    } else if ((field.type != 'text' && field.type != 'email' && field.type != 'password')) {
      //Generate label even if it is placeholder
      label += 'for="'+ field.name +'">' + text;
      return label + '</label>';

    } else if (!placeholder){
      // generate label only if no placeholder
      label += 'for="'+ field.name +'">' + text;
      return label + '</label>';

    }
    return '';
  }

  var parseSimpleFormType = function(field, hasPlaceholder) {
    var input = hasPlaceholder ? "" : generateLabel(field, hasPlaceholder);
    var displayName = field.attr.displayname || field.name || undefined;
    input += '<input type="' + field.type + '" ';
    input += parseBasicFieldAttributes(field);

    // Placeholder
    input += (hasPlaceholder && displayName) ? 'placeholder="' + displayName + '"' : '';

    // MinLenght
    input += field.requirements.minLenght ? 'minlength="' + field.requirements.minLenght + '"' : '';

    // MaxLenght
    input += field.requirements.maxLenght ? 'maxlength="' + field.requirements.maxLenght + '"' : '';

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

  var parseFileType = function(field) {
    var input = generateLabel(field, false);
    input += '<input type="file" ';
    input += parseBasicFieldAttributes(field);
    input += '/>';
    return input;
  }

  var parseCheckBoxType = function(field, hasPlaceholder) {
    var input = '<input type="checkbox" ';
    input += parseBasicFieldAttributes(field);
    input += ' />';
    input += generateLabel(field, hasPlaceholder);
    return input;
  }

  var parseHiddenType = function(field) {
    var input = '<input type="hidden" ';
    input += parseBasicFieldAttributes(field);
    input += ' />';
    return input;
  }


  var parseNumberType = function(field, hasPlaceholder) {
    var input = generateLabel(field, hasPlaceholder);
    input += '<input type="number" ';
    input += parseBasicFieldAttributes(field);
    input += field.requirements.min ? 'min="' + field.requirements.min + '"' : '';
    input += field.requirements.max ? 'max="' + field.requirements.max + '"' : '';
    input += ' />';

    return input;
  }

  var parseTextAreaType = function(field, hasPlaceholder) {
    var input = generateLabel(field, hasPlaceholder);
    input += '<textarea ';
    input += parseBasicFieldAttributes(field);
    input += field.type == "ckeditor" ? ' ckeditor ' : '';

    // Rows
    input += field.attr.rows ? 'rows="'+ field.attr.rows +'"' : '';
    // Cols
    input += field.attr.cols ? 'cols="'+ field.attr.cols +'"' : '';

    // MinLenght
    input += field.requirements.minLenght ? 'minlength="' + field.requirements.minLenght + '"' : '';

    // MaxLenght
    input += field.requirements.maxLenght ? 'maxlength="' + field.requirements.maxLenght + '"' : '';
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

  var parseLiveVar = function(field) {
    return generateLabel(field, false) +
      '<lml:livevars data-filler="' + field.attr.tag +
      '" data-fieldname="' + field.name +
      '" data-filling="' + field.attr.template +
      '" data-varname="' + field.attr.endpoint +
      '" data-varparam="' + JSON.stringify(field.attr.props).replace(/"/g, '&lmlquote;') +
      '"></lml:livevars>';
  };

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
    attributes += 'class="v_validate, ' + parseClasses(field) + '" ';

    // Data-...
    for (var key in field.attr.data ) {
      attributes += 'data-'+ key +'="'+ field.attr.data[key] +'" ';
    }
    return attributes;
  }

  var parseClasses = function(field) {
    var classHtml = '';

    if (typeof field.attr.classes !== 'undefined') {
      for (var index in field.attr.classes) {
        classHtml += ',' + field.attr.classes[index];
      }
    }


    return classHtml;
  }
}

module.exports = new HtmlParser();
