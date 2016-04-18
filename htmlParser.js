var log = require('./log.js');
/**
 * HtmlParser is a parser for various javascript objects.
 * @return {HtmlParser} [The HtmlParser as a node module]
 */
var HtmlParser = function () {
    this.types = {};

    this.registerType = function (name, fct) {
        this.types[name] = fct;
    }

    this.parseForm = function (form) {
        log('HTMLParser', 'Parding form ' + form.name);
        var htmlForm = '';
        var submitButton = '';
        if (typeof form == 'undefined') {
            throw new Error("[HtmlParser - No form provided to parse");
        }
        var hasFormWrapper = typeof form.attr.formWrapper !== "undefined";

        if (hasFormWrapper && !form.attr.formWrapper.inner) {
            htmlForm += '<' + (form.attr.formWrapper.tag || 'div') +
                ' class="' + form.attr.formWrapper.class + '"' +
                ' id="' + form.attr.formWrapper.id + '">';
        }
        // Form tag generation
        htmlForm = '<form ';

        if (form.attr.validate) {
            htmlForm += 'class="v_form_validate lmlform ' + (form.attr.cssClass || "") + '" ';
        }

        // Name
        htmlForm += form.name ? 'name="' + form.name + '"' : "";

        //id
        htmlForm += 'id="' + (form.attr.id ? form.attr.id : form.name) + '" ';

        // Method
        htmlForm += form.attr.method ? 'method="' + form.attr.method.toUpperCase() + '"' : 'method="POST"';

        // Action
        htmlForm += form.attr.action ? "action='" + form.attr.action + "' " : "";
        if (form.attr.method == 'post') {
            htmlForm += ' enctype="multipart/form-data" ';
        }

        htmlForm += '/>';

        var hasFieldWrapper = typeof form.attr.fieldWrapper !== "undefined";
        if (hasFormWrapper && form.attr.formWrapper.inner) {
            htmlForm += '<' + (form.attr.formWrapper.tag || 'div') +
                ' class="' + form.attr.formWrapper.class + '"' +
                ' id="' + form.attr.formWrapper.id + '">';
        }


        //Generate fields
        var fieldsRendered = 0;
        for (var index in form.fields) {
            fieldsRendered++;
            field = form.fields[index];

            if (typeof field.attr.wrapper !== 'undefined') {
                htmlForm += '<' + (field.attr.wrapper.tag || 'div') +
                    ' class="' + (field.attr.wrapper.class || '') + '"' +
                    ' id="' + (field.attr.wrapper.id || '') + '">';
            }

            if (hasFieldWrapper) {
                htmlForm += '<' + (form.attr.fieldWrapper.tag || 'div') +
                    ' class="' + (field.attr.wrapperCssPrefix || form.attr.fieldWrapper.cssPrefix || form.attr.fieldWrapper.class || 'field-') +
                    (field.attr.wrapperCssSuffix || form.attr.wrapperCssSuffix || field.type) +
                    (' lmlform-fieldwrapper-' + field.type) +
                    ' lmlform-fieldwrapper">';
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
                case 'number':
                    htmlForm += parseNumberType(field, form.attr.placeholder);
                    break;
                case 'money':
                    field.requirements.step = 0.01;
                    htmlForm += parseNumberType(field, form.attr.placeholder);
                    break;
                case 'hidden':
                    htmlForm += parseHiddenType(field);
                    break;
                case 'checkbox':
                    htmlForm += parseCheckBoxType(field, form.attr.placeholder);
                    break;
                case 'ckeditor':
                    htmlForm += parseTextAreaType(field, form.attr.placeholder);
                    break;
                case 'file':
                    htmlForm += parseFileType(field);
                    break;
                case 'select':
                    htmlForm += parseSelectType(field);
                    break;
                case 'lmlselect':
                    htmlForm += parseSelectType(field);
                    break;
                case 'stack':
                    htmlForm += parseStackType(field);
                    break;
                case 'livevar':
                    htmlForm += parseLiveVar(field);
                    break;
                case "title":
                    htmlForm += parseTitleType(field);
                    break;
                case "multiselect":
                    htmlForm += parseSelectType(field, true);
                    break;
                case "tags":
                    htmlForm += parseTagsType(field);
                default:
                    htmlForm += this.checkRegisteredTypes(field);
                }

            }

            if (hasFieldWrapper) {
                htmlForm += "</" + (form.attr.fieldWrapper.tag || "div") + ">";
            }

            htmlForm += form.attr.afterField || "";

            if (typeof field.attr.wrapper !== 'undefined') {
                htmlForm += '</' + (field.attr.wrapper.tag || 'div') + '>';
            }
        }



        //Insert submit form
        htmlForm += submitButton;

        if (hasFormWrapper && form.attr.formWrapper.inner) {
            htmlForm += "</" + (form.attr.formWrapper.tag || "div") + ">";
        }
        // Close form tag
        htmlForm += "</form>";

        if (hasFormWrapper && !form.attr.formWrapper.inner) {
            htmlForm += "</" + (form.attr.formWrapper.tag || "div") + ">";
        }

        var deps = form.attr.dependencies;
        if (deps) {
            for (var i = 0; i < deps.length; i++) {
                htmlForm += '<lml:livevars data-varname="' + deps[i] + '" data-cacheonly="true" data-fromform="' + form.name + '"></lml:livevars>';
            }
        }

        log('HTMLParser', "Parsed form " + form.name + " with " + fieldsRendered + " fields");
        return htmlForm;
    };

    this.checkRegisteredTypes = function (field) {
        if (typeof field.type !== 'undefined' && this.types[field.type]) {
            return this.types[field.type](field);
        }
        return '';
    };

    var generateLabel = function (field, placeholder) {
        if (field.nolabel) {
            return "";
        }

        var label = '<label ';
        var text = field.attr.displayname || field.name;

        // Never generate label for those
        if (field.type == 'button' || field.type == 'submit' || field.type == 'hidden') {
            return '';
        } else if ((field.type != 'text' && field.type != 'email' && field.type != 'password')) {
            //Generate label even if it is placeholder
            label += 'for="' + field.name + '">' + text;
            return label + '</label>';

        } else if (!placeholder) {
            // generate label only if no placeholder
            label += 'for="' + field.name + '">' + text;
            return label + '</label>';

        }
        return '';
    };

    var parseStackField = function (field) {
        return '<input type="' + (field.dataType || 'text') +
            '" class="lmlstacktableheaderfield lmlstacktableheaderfield-' + field.fieldName +
            '" data-fieldname="' + field.fieldName +
            '" value="" />';
    };

    var parseTitleType = function (field) {
        var tag = field.attr.type || "h3";
        var content = field.attr.displayname || field.name || "";

        return field.attr.html || (
            "<" + tag + ">" + content + "</" + tag + ">"
        );
    };

    var parseStackType = function (field, hasPlaceholder) {
        var scheme = field.attr.scheme;
        var columns = scheme.columns;
        var html = "";
        var displayName = field.attr.displayname || field.name || undefined;

        html += '<label for="' + field.name + '">' + displayName + '</label>';
        html += '<div class="lmlstacktablewrapper" data-fieldname="' + field.name + '" >';
        html += '<table class="lmlstacktable" data-fieldname="' + field.name +
            '" id="lmlstacktable-' + field.name +
            '" data-title="' + displayName +
            '" data-scheme="' + JSON.stringify(scheme).replace(/\"/g, '&lmlquote;') + '"><thead><tr>';

        for (var i = 0; i < columns.length; i++) {
            html += '<th>' + columns[i].displayname + '</th>';
        }

        html += '<th></th></tr>';

        for (var i = 0; i < columns.length; i++) {
            html += '<th>' + parseStackField(columns[i]) + '</th>';
        }

        html += '<th><button class="lmlstacktableappendbutton">Append</button></th></tr></thead></tbody></tbody></table>';
        return html;
    };

    var parseTagsType = function (field, hasPlaceholder) {
        var html = "";
        var displayName = field.attr.displayname || field.name || undefined;

        html += '<label for="' + field.name + '">' + displayName + '</label>';
        html += '<div class="lmltagswrapper" data-type="tags" data-fieldname="' + field.name + '" >';
        html += '<div class="tags-input"><input type="text"></div>';
        html += '<div><p>' + (field.attr.footer || '') + '</p></div>';
        html += '</div>'
        return html;
    };

    var parseSimpleFormType = function (field, hasPlaceholder) {
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
    };

    var parseButtonType = function (field) {
        var input = '<button type="button" ';
        input += parseBasicFieldAttributes(field);
        input += '>';
        input += (field.attr.displayname || field.name) + '</button>';
        return input;
    };

    var parseFileType = function (field) {
        var input = generateLabel(field, false);
        input += '<input type="file" ';
        input += parseBasicFieldAttributes(field);
        input += '/>';
        return input;
    };

    var parseCheckBoxType = function (field, hasPlaceholder) {
        var input = generateLabel(field, hasPlaceholder);
        input += '<input type="checkbox" ';
        input += parseBasicFieldAttributes(field);
        input += ' />';
        return input;
    };

    var parseSelectType = function (field, isMultiple) {
        var multiple = isMultiple ? ' multiple ' : '';
        var input = generateLabel(field) + '<select ' + parseBasicFieldAttributes(field) + multiple + ' >';

        if (field.attr.datasource) {
            for (var i = 0; i < field.attr.datasource.length; i++) {
                var item = field.attr.datasource[i];
                input += '<option value="' + item.name + '">' + item.displayName + '</option>';
            }
        }

        return input + "</select>";
    };

    var parseHiddenType = function (field) {
        var input = '<input type="hidden" ';
        input += parseBasicFieldAttributes(field);
        input += ' />';
        return input;
    };


    var parseNumberType = function (field, hasPlaceholder) {
        var input = generateLabel(field, hasPlaceholder);
        input += '<input type="number" ';
        input += parseBasicFieldAttributes(field);
        input += field.requirements.min ? 'min="' + field.requirements.min + '"' : '';
        input += field.requirements.max ? 'max="' + field.requirements.max + '"' : '';
        input += field.requirements.step ? 'step="' + field.requirements.step + '"' : '1';
        input += ' />';

        return input;
    };

    var parseMultipleType = function (field) {
        var input = generateLabel(field);

    };

    var parseTextAreaType = function (field, hasPlaceholder) {
        var input = generateLabel(field, hasPlaceholder);
        input += '<textarea ';
        input += parseBasicFieldAttributes(field);
        input += field.type == "ckeditor" ? ' ckeditor ' : '';

        // Rows
        input += field.attr.rows ? 'rows="' + field.attr.rows + '"' : '';
        // Cols
        input += field.attr.cols ? 'cols="' + field.attr.cols + '"' : '';

        // MinLenght
        input += field.requirements.minLenght ? 'minlength="' + field.requirements.minLenght + '"' : '';

        // MaxLenght
        input += field.requirements.maxLenght ? 'maxlength="' + field.requirements.maxLenght + '"' : '';
        input += ' >';
        input += field.attr.value ? field.attr.value : '';
        input += '</textarea>'
        return input;
    };

    var parseSubmitType = function (field) {
        var input = '<input type="submit" ';
        input += field.attr.value ? 'value="' + field.attr.value + '" ' : ' value="' + field.name + '" ';
        input += 'class="v_validate ' + parseClasses(field) + '" ';
        input += '/>'
        return input;
    };

    var parseLiveVar = function (field) {
        return generateLabel(field, false) +
            '<lml:livevars ' +
            'data-attribute="' + (field.attr.attr ? JSON.stringify(field.attr.attr).replace(/"/g, '&lmlquote;') : "{}") +
            '" data-filler="' + field.attr.tag +
            '" data-fieldname="' + field.name +
            '" data-filling="' + field.attr.template +
            '" data-varname="' + field.attr.endpoint +
            '" data-title="' + (field.attr.title || "") +
            '" data-scheme="' + (field.attr.datascheme ? JSON.stringify(field.attr.datascheme).replace(/"/g, '&lmlquote;') : "{}") +
            '" data-varparam="' + (field.attr.props ? JSON.stringify(field.attr.props).replace(/"/g, '&lmlquote;') : "{}") +
            '"></lml:livevars>';
    };

    var parseBasicFieldAttributes = function (field) {
        var attributes = '';

        // Name
        attributes += field.name ? 'name="' + field.name + '" ' : '';

        // ID
        attributes += field.attr.id ? 'id="' + field.attr.id + '" ' : '';

        // Value
        attributes += field.attr.value ? 'value="' + field.attr.value + '" ' : '';

        // Is required?
        if (field.type == 'checkbox') {
            attributes += field.requirements.required ? 'data-required="true"' : '';
        } else {
            attributes += field.requirements.required ? ' required ' : '';
        }

        // Is disbled?
        attributes += field.attr.disabled ? 'disabled ' : '';

        // Classes
        attributes += 'class="v_validate ' + parseClasses(field) + '" ';

        // Data-...
        for (var key in field.attr.data) {
            attributes += 'data-' + key + '="' + field.attr.data[key] + '" ';
        }
        return attributes;
    };

    var parseClasses = function (field) {
        var classHtml = '';

        if (typeof field.attr.classes !== 'undefined') {
            for (var index in field.attr.classes) {
                classHtml += ' ' + field.attr.classes[index];
            }
        }


        return classHtml;
    };
}

module.exports = new HtmlParser();
