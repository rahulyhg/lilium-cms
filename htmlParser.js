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

    this.parseForm = function (form, formContext, livevarSource) {
        log('HTMLParser', 'Parsing form ' + form.name);
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

        if (formContext) {
            htmlForm += ' data-context="' + formContext + '" ';
        }

        if (form.attr.json) {
            htmlForm += ' json="true" ';
        }

        // LMLDom v.0.6+
        if (livevarSource) {
            htmlForm += ' data-livevarsource="'+livevarSource.replace(/\//g, '.')+'" ';
        }

        if (form.attr.validate) {
            htmlForm += 'class="v_form_validate lmlform ' + (form.attr.cssClass || "") +  (form.attr.async ? " lml-async" : "") +
                (livevarSource ? " lmldom-filled-form" : "") + '" ';
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

        htmlForm += '>';

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

            if (hasFieldWrapper && field.attr.nowrap !== true) {
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
                case 'date':
                    htmlForm += parseDateType(field, form.attr.placeholder);
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
                case "buttonset":
                    htmlForm += parseButtonSetType(field);
                    break;
                case "tags":
                    htmlForm += parseTagsType(field);
                    break;
                case "lmlsection":
                    htmlForm += parseSection(field);
                    break;
                case "map" :
                    htmlForm += parseMap(field);
                    break;
                case "lmlclosure":
                    htmlForm += parseClosure(field);
                    break;
                // LMLDom 0.8+
                case "quill":
                    htmlForm += parseQuillEditor(field);
                    break;
                case "lmleditor":
                    htmlForm += parseLMLEditor(field);
                    break;
                case "treeselect":
                    htmlForm += parseTreeViewSelect(field);
                    break;
                case "liveselect":
                    htmlForm += parseLiveSelect(field);
                    break;
                case 'multibox':
                    htmlForm += parseMultiBox(field);
                    break;
                case "snip":
                    htmlForm += parseSnipField(field);
                    break;
                default:
                    htmlForm += this.checkRegisteredTypes(field);
                }

            }

            if (hasFieldWrapper && field.attr.nowrap !== true) {
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
                htmlForm += '<lml-livevars data-varname="' + deps[i] + '" data-cacheonly="true" data-fromform="' + form.name + '"></lml-livevars>';
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
        if (field.attr.nolabel) {
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
        switch (field.dataType) {
            case undefined:
            case 'text':
                return '<input type="text" class="lmlstacktableheaderfield lmlstacktableheaderfield-' + field.fieldName +
                    '" data-fieldname="' + field.fieldName +
                    '" value="" />';
            case 'select': 
                var str = '<select class="lmlstacktableheaderfield lmlstacktableheaderfield-'+field.fieldName+'" ' +
                    'data-fieldname="'+field.fieldName+'">';
                if (field.dataSource) {
                    field.dataSource.forEach(function(opt) {
                        str += '<option value="'+(opt.value || opt.name || opt)+'">'+(opt.displayname || opt.value || opt)+'</option>';
                    });
                }
                return str + '</select>';
        }
    };

    // Undone
    var parsePetalField = function(field) {
        var petalname = field.attr.petal;
        if (!petalname) {
            return "";
        } else {
            require('./petal.js').compileString;
            return "";
        }
    };

    var parseQuillEditor = function(field) {
        return '<div class="lmldom-snip quill-template" data-snip="quill" data-snipname="'+field.name+'" data-name="'+field.name+'" ></div>';
    };

    var parseSnipField = function(field) {
        var lvs = "";
        if (field.attr.livevars) for (var i = 0; i < field.attr.livevars.length; i++) {
            lvs += '<lml-livevars data-varname="'+field.attr.livevars[i]+'" data-param="{}"></lml-livevars>';
        }

        return lvs + '<div class="lmldom-snip" data-snip="' + field.attr.snip + '" data-snipname="'+field.name+'" ></div>';
    };

    var parseSection = function(field) {
        return '<section class="lmlform-cond-section lmlform-section ' + (field.attr.classes ? field.attr.classes.join(' ') : '') +
            '" data-if="' + (field.attr.show ? JSON.stringify(field.attr.show).replace(/\"/g, '&lmlquote;') : "") +
            '" data-sectionname="' + field.attr.sectionname + '">';
    };

    var parseClosure = function(field) {
        return '<input type="hidden" class="lmlsection-ignore" name="lmlsection-'+field.attr.sectionname+'-ignore" value="0"/></section>';
    };

    var parseMap = function(field) {
        var purifiedName = field.name.replace(/\-\.\s/g, '');
        
        return '<div class="fieldmap-wrapper"><input type="text" class="lml-leaflet-search-input lml-field-nosubmit" placeholder="Input address or business name" data-leafletname="'+purifiedName+'" id="leaflet-search-'+purifiedName+'" name="'+purifiedName+'display" /><div id="leaflet-'+purifiedName+'" class="lml-leafletmap"></div></div><input type="hidden" name="'+purifiedName+'" data-type="leaflet" id="'+purifiedName+'coords" />' +
        '<script>window["llmap'+purifiedName+'"] = L.map("leaflet-'+purifiedName+'", {' +
            'scrollWheelZoom : false,' +
            'keyboard : false,' +
            'zoomControl : false' +
        '}).setView([0, 0], 2);' +
        'L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicnlrZGVzamFyZGlucyIsImEiOiJjaWpoczBoY2IwMnd3dTZtNXFydWE0b2FyIn0.YQopNaZuNF0Rh0ESi4rDVw", {' +
            'attribution: "",' +
            'maxZoom: 18,' +
            'id: "mapbox.streets"' +
        '}).addTo(window["llmap'+purifiedName+'"]);</script>';
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

        if (field.attr.displayname && !field.attr.notitle) { 
            html += '<label for="' + field.name + '">' + displayName + '</label>'; 
        }

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

        html += '<th><button class="lmlstacktableappendbutton">Append</button></th></tr></thead></tbody></tbody></table></div>';
        return html;
    };

    var parseLMLEditor = function(field) {
        return '<lml-editor data-name="'+field.name+'"></lml-editor>';
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

    var parseTreeViewSelect = function(field) {
        var attr = field.attr;
        var output = '<lml-livevars data-varname="'+attr.endpoint+'" data-varparam="{}" ></lml-livevars>' +
            '<label for="'+field.name+'">'+attr.displayname+'</label>' +
            '<input type="hidden" name="'+field.name+'" class="lmldom-treeselect-value" />' + 
            '<div class="lmldom-treeselect" data-fieldname="'+field.name+'" data-filledby="'+attr.endpoint+'" '+ 
                'data-selectreadkey="'+(attr.select.readkey||field.name)+'" ' + 
                'data-selectvalue="'+attr.select.value+'" '+
                'data-selectdisplayname="'+attr.select.displayname+'" id="lml-treeselect-'+field.name+'" >' +
                    '<div class="lml-treeselect-choices"></div>' +
            '</div>';

        if (field.wrapper) {
            var tagname = field.wrapper.tag || "div";
            output = '<'+tagname+' class="'+(field.wrapper.class || "")+'">' + output + '</'+tagname+'>';
        }

        return output;
    };

    var parseButtonType = function (field) {
        var input = '<button type="button" ';
        input += parseBasicFieldAttributes(field);
        input += (field.attr.callback ? ' onclick="window.'+field.attr.callback+'();" ' : '')
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

    var parseLiveSelect = function(field) {
        var attr = field.attr;
        var output = '<lml-livevars data-varname="'+attr.endpoint+'" data-varparam="{}" ></lml-livevars>' +
            '<label for="'+field.name+'">'+attr.displayname+'</label>' +
            '<select name="'+field.name+'" class="lmldom-liveselect" data-filledby="'+attr.endpoint+'" ' + 
                (attr.select.readkey ? 'data-selectreadkey="'+attr.select.readkey+'" ' : "") + 
                'data-selectvalue="'+attr.select.value+'" '+
                'data-selectdisplayname="'+attr.select.displayname+'" >';
        
        if (attr.empty) {
            output += '<option value="" class="lmldom-liveselect-opt-none">'+attr.empty.displayname+'</option>';
        }

        return output + "</select>";
    };

    var parseMultiBox = function(field) {
        var attr = field.attr;
        var output = '<lml-livevars data-varname="'+attr.endpoint+'" data-varparam="{}" ></lml-livevars>' +
            '<label for="'+field.name+'">'+attr.displayname+'</label>' +
            '<input type="hidden" name="'+field.name+'" class="lmldom-multibox-value" />' + 
            '<div class="lmlmultiselect multiselect lmldom-multibox" data-fieldname="'+field.name+'" data-filledby="'+attr.endpoint+'" '+ 
                (attr.select.readkey ? 'data-selectreadkey="'+attr.select.readkey+'" ' : "") + 
                'data-selectmultiple="'+(attr.select.multiple||false)+'" '+
                'data-selectvalue="'+attr.select.value+'" '+
                'data-selectdisplayname="'+attr.select.displayname+'" id="lml-multibox-'+field.name+'" >' +
            '</div>';

        if (field.wrapper) {
            var tagname = field.wrapper.tag || "div";
            output = '<'+tagname+' class="'+(field.wrapper.class || "")+'">' + output + '</'+tagname+'>';
        }

        return output;
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

    var parseDateType = function(field, hasPlaceholder) {
        var input = generateLabel(field, hasPlaceholder);
        input += '<input type="date' + (field.attr.datetime ? "time-local" : "") +'" ';
        input += parseBasicFieldAttributes(field);
        input += ' />';

        return input;
    };

    var parseButtonSetType = function(field) {
        var btnSet = new Array();

        field.attr.buttons.forEach(function(btn, index) {
            btnSet.push(
                '<button '+(btn.type?'type="'+btn.type+'"':'')+
                ' class="'+(btn.classes?btn.classes.join(' '):'')+
                '" name="'+btn.name+
                '" '+ (btn.callback ? ('onclick="'+btn.callback+'"') : '') +
                '>'+
                    (btn.displayname?btn.displayname:btn.name)+
                '</button>'
            );
        });

        return btnSet.join(' ');
    };

    var parseTextAreaType = function (field, hasPlaceholder) {
        var input = generateLabel(field, hasPlaceholder);
        input += '<textarea ';
        input += parseBasicFieldAttributes(field);
        input += field.type == "ckeditor" ? ' ckeditor data-editor="ckeditor" ' : ''; 

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
            '<lml-livevars ' +
            'data-attribute="' + (field.attr.attr ? JSON.stringify(field.attr.attr).replace(/"/g, '&lmlquote;') : "{}") +
            '" data-filler="' + field.attr.tag +
            '" data-fieldname="' + field.name +
            '" data-readkey="' + (field.attr.readkey || field.name) +
            '" data-filling="' + field.attr.template +
            '" data-varname="' + field.attr.endpoint +
            '" data-title="' + (field.attr.title || "") +
            '" data-scheme="' + (field.attr.datascheme ? JSON.stringify(field.attr.datascheme).replace(/"/g, '&lmlquote;') : "{}") +
            '" data-varparam="' + (field.attr.props ? JSON.stringify(field.attr.props).replace(/"/g, '&lmlquote;') : "{}") +
            '"></lml-livevars>';
    };

    var parseBasicFieldAttributes = function (field) {
        var attributes = '';

        // Name
        attributes += field.name ? 'name="' + field.name + '" ' : '';

        // ID
        attributes += field.attr.id ? 'id="' + field.attr.id + '" ' : '';

        // Value
        attributes += field.attr.value ? 'value="' + field.attr.value + '" ' : '';

        // Tab Index
        attributes += field.attr.tabindex ? 'tabindex="' + field.attr.tabindex + '" ' : '';

        // Is required?
        if (field.type == 'checkbox') {
            attributes += field.requirements.required ? 'data-required="true"' : '';
        } else {
            attributes += field.requirements.required ? ' required ' : '';
        }

        if (field.type == 'button') {
            attributes += field.attr.onclick ? ' onclick="window.'+field.attr.onclick+'(this);" ' : '';
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
