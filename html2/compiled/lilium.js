/*********************************************************************************************************
*                                                                                                       *
*  88          88 88 88                                     ,ad8888ba,  88b           d88  ad88888ba    *
*  88          "" 88 ""                                    d8"'    `"8b 888b         d888 d8"     "8b   *
*  88             88                                      d8'           88`8b       d8'88 Y8,           *
*  88          88 88 88 88       88 88,dPYba,,adPYba,     88            88 `8b     d8' 88 `Y8aaaaa,     *
*  88          88 88 88 88       88 88P'   "88"    "8a    88            88  `8b   d8'  88   `"""""8b,   *
*  88          88 88 88 88       88 88      88      88    Y8,           88   `8b d8'   88         `8b   *
*  88          88 88 88 "8a,   ,a88 88      88      88     Y8a.    .a8P 88    `888'    88 Y8a     a8P   *
*  88888888888 88 88 88  `"YbbdP'Y8 88      88      88      `"Y8888Y"'  88     `8'     88  "Y88888P"    *
*                                                                                                       *
*********************************************************************************************************
* LILIUM CMS | GLOBAL FRONTEND JAVASCRIPT                                                               *
*                                                                                                       *
* Author : Erik Desjardins                                                                              *
* Contributors : Samuel Rondeau-Millaire                                                                *
* Description : Global styling for admin section of Lilium.                                             *
* Documentation : http://liliumcms.com/docs                                                             *
*********************************************************************************************************/
var debugMode = 'true';
var socket = typeof io !== 'undefined' ? io() : undefined;
window.location.urlBase = "//liliumdev.com:8080/";
var LiliumCMS = function() {
var livevars;
var livevarsResponse;
var urlParams;
var pushtables = new Array();
var stacktables = new Array();
var queryParams = new Object();
var that = this;
var LiliumEvents = {
livevarsPrerendered: {
name: "livevarsPrerendered"
},
livevarsRendered: {
name: "livevarsRendered"
},
livevarsFetched: {
name: "livevarsFetched"
}
};
var LiveVars = function() {
var endpoints = [];
var paramString = "?";
this.getLiveVars = function(cb) {
urlParams = window.location.pathname.split('/');
// regex to match { $1 }
var reg = /({\?\s*[0-9]\s*})/g;
$("lml\\:livevars").each(function() {
var elem = this;
if (endpoints.indexOf($(this).data('varname')) == -1) {
var params = $(this).data('varparam');
var variableName = $(this).data('varname');
// Check for { $1 } to extract params from the url
var urls = variableName.match(reg);
if (urls !== null) {
urls.forEach(function(elem) {
var urlPos = elem.match(/[0-9]/);
var param = urlParams[urlParams.length - (urlPos)];
var urlposReg = new RegExp("({\\?\\s*[" + urlPos + "]\\s*})", "g");
variableName = variableName.replace(urlposReg, param);
});
elem.dataset.varname = variableName;
}
endpoints.push({
'varname': variableName,
'params': typeof params === "string" ? JSON.parse(params.replace(/&lmlquote;/g, '"')) : {}
});
}
});
endpoints.push({
'varname': 'session',
'params': new Object()
});
$.get("/livevars", {
vars: JSON.stringify(endpoints)
}, function(data) {
livevars = deepUnescape(data.livevars);
livevarsResponse = data.response;
document.dispatchEvent(new CustomEvent('livevarsFetched', {
'detail': {
'livevars': livevars
}
}));
return cb(livevars);
});
};
this.livevars = function() {
return livevars;
};
var pullOutVarFromString = function(object, str) {
var levels = str.split('.');
var pullout = object;
for (var i = 0; i < levels.length; i++) {
pullout = pullout[levels[i]];
}
return pullout;
};
var fetchTemplateObjectContent = function(obj, data, domTarget, livevarkey) {
var key = obj.data('key');
var template = $('#' + obj.data('template'));
var sep = obj.data('arrayseparator');
var content = "";
if (typeof key !== 'undefined') {
// Split for keys like : endpoint.variable.id
var keys = key.split('.');
var currentData = data;
keys.forEach(function(elem, i) {
//Check if data[key] exists
if (typeof currentData[elem] !== 'undefined') {
currentData = currentData[elem];
//Check if it is the last key
if (keys.length == i + 1) {
// Append data
// Check if array or object
if (typeof currentData === 'object' && Object.prototype.toString.call(currentData) === '[object Array]' && currentData.length != 0) {
for (var i = 0; i < currentData.length; i++) {
if (typeof currentData === 'object') {
generateTemplateFromObject(template, obj, currentData[i], livevarkey);
} else {
content += currentData[i] + (i == currentData.length - 1 ? "" : sep);
}
}
} else {
content = currentData;
}
}
} else {
content = obj.html();
}
});
} else {
content = obj.html();
}
return content;
};
var generateTemplateFromObject = function(domTemplate, domTarget, data, livevarkey) {
var templateItems = domTemplate.clone();
while (templateItems.find('lml\\:tobject').length !== 0) templateItems.find('lml\\:tobject').each(function(index, obj) {
obj = $(obj);
var nodeType = obj.data('nodetype');
var action = obj.data('action');
var filter = obj.data('filter');
var passed = true;
if (typeof window[filter] === 'function') {
passed = window[filter].apply(data, [data]);
}
if (passed) {
var node = $(document.createElement(nodeType));
if (typeof livevarkey !== 'undefined') {
node.context.dataset.livevarkey = livevarkey;
}
if (nodeType == 'img') {
node.attr('src', fetchTemplateObjectContent(obj, data, domTarget, livevarkey));
} else if (nodeType == 'a') {
if (obj.data('href')) {
node.attr('href', obj.data('href') + fetchTemplateObjectContent(obj, data, domTarget, livevarkey));
} else if (obj.data('hrefsource')) {
var prepend = obj.data('prependroot') ? window.location.urlBase : "";
node.attr('href', prepend + pullOutVarFromString(data, obj.data('hrefsource')));
}
node.html(obj.html());
} else {
node.html(fetchTemplateObjectContent(obj, data, domTarget, templateItems, livevarkey));
}
if (obj.data('class')) {
var classes = obj.data('class').split(' ');
for (var ci = 0; ci < classes.length; ci++) {
node.addClass(classes[ci]);
}
}
if (obj.data('classsource')) {
var classSrc = obj.data('classsource');
var classes = data[classSrc];
classes = classes ? classes.split(' ') : [];
for (var ci = 0; ci < classes.length; ci++) {
node.addClass(classes[ci]);
}
}
if (action && typeof window[action] === 'function') {
var paramkey = obj.data('actionparamkey');
var bindName = obj.data('bind');
node.bind(bindName, function() {
window[action].apply(data, [data[paramkey], node]);
});
}
obj = $(obj).replaceWith(node);
} else {
$(obj).remove();
}
});
var wrap = domTemplate.data('wrapper');
if (wrap) {
templateItems.html('<' + wrap + '>' + templateItems.html() + '</' + wrap + '>');
}
if (domTarget.data('target')) {
$('#' + domTarget.data('target')).append(templateItems.children());
} else {
$(domTarget).before(templateItems.children());
}
return true;
};
var generateFillingFromObject = function(filler, fillingData, data) {
var props = typeof fillingData.varparam == "object" ? fillingData.varparam : JSON.parse(fillingData.varparam.replace(/&lmlquote;/g, '"'));
var filling = $(document.createElement(fillingData.filling));
for (var key in props) {
if (key === 'html') {
filling.html(data[props[key]]);
} else {
filling.attr(key, data[props[key]]);
}
}
filler.append(filling);
};
this.parseTextToView = function() {
$("lml\\:livevars").each(function() {
var lmlTag = $(this);
if (typeof livevars[this.dataset.varname] === "object") {
var templateName = $(this).data('template');
var varValue = livevars[this.dataset.varname];
var fillerName = $(this).data('filler');
var sourceof = $(this).data('sourceof');
var cacheonly = $(this).data('cacheonly');
var livevarkey = this.dataset.varname;
if (livevars[this.dataset.varname].length == 0) {
var template = $('#'+templateName);
$(this).after($(template).find('lml\\:empty').html());
}
if (sourceof && sourceof != "") {
(function(src, data) {
document.addEventListener(LiliumEvents.livevarsPrerendered.name, function() {
if ($.isArray(data)) {
for (var key in data) {
fillFormFromSource(src, data[key], key);
}
}else {
fillFormFromSource(src, data);
}
});
})(sourceof, varValue);
}
if (cacheonly) {
// $(lmlTag).remove();
} else if (fillerName == "pushtable") {
var datascheme = $(this).data('scheme');
var pushTable = new PushTable($(this).data('fieldname'), $(this).data('title'), datascheme, varValue);
pushtables.push(pushTable);
$(lmlTag).after(pushTable.render());
} else if (templateName != "" && $('#' + $(this).data('template')).length != 0) {
var templateObj = $('#' + $(this).data('template'));
if (templateObj.length != 0) {
if (varValue.length > 0) {
varValue.forEach(function(val, index) {
generateTemplateFromObject(templateObj, lmlTag, val, livevarkey);
});
} else if (typeof varValue !== 'undefined' && typeof varValue.length === 'undefined') {
generateTemplateFromObject(templateObj, lmlTag, varValue, livevarkey);
}
}
// $(lmlTag).remove();
} else if (fillerName != "") {
var filler = $(document.createElement(fillerName));
filler.attr('name', lmlTag.data('fieldname'));
if (typeof varValue.length !== 'undefined' && varValue.forEach) {
varValue.forEach(function(val, index) {
generateFillingFromObject(filler, lmlTag.data(), val);
});
} else {
generateFillingFromObject(filler, lmlTag.data(), varValue);
}
$(lmlTag).after(filler);
} else {
$(this).text(JSON.stringify(livevars[$(this).data('varname')]));
$(this).text(unescape(livevars[$(this).data('varname')]));
}
}
});
// Lilium Templates
$('lml\\:template').remove();
// Fire ready event
document.dispatchEvent(new CustomEvent('livevarsPrerendered', {
'detail': {
'livevars': livevars
}
}));
document.dispatchEvent(new CustomEvent('livevarsRendered', {
'detail': {
'livevars': livevars
}
}));
};
this.livevars = function() {
return livevars;
};
this.exec = function() {
var that = this;
that.getLiveVars(function() {
that.parseTextToView();
});
};
document.addEventListener('livevarsFetched', function() {
$('form input[data-rights]').each(function() {
if (livevars.session.roles.indexOf('lilium') == -1 &&
livevars.session.roles.indexOf('admin') == -1 &&
livevars.session.roles.indexOf($(this).data('rights')) == -1) {
$(this).closest('label[for=' + $(this).attr(name) + ']').remove();
$(this).remove();
};
});
})
};
this.getUrlParams = function() {
return urlParams;
}
var FormBeautifier = function() {
var createCheckboxWrapper = function(oObj) {
var obj = document.createElement('div');
obj.setAttribute('name', oObj.getAttribute('name'));
obj.classList.add('lmlbeautifiedcheckbox');
if (oObj.checked) {
obj.classList.add("checked");
}
return obj;
};
this.beautify = function() {
$('input[type="checkbox"]:not(.systeminput)').each(function(index, cbox) {
var beautifulCheckbox = $(createCheckboxWrapper(cbox));
$(beautifulCheckbox).bind('click', function() {
$(this).toggleClass('checked');
cbox.checked = $(this).hasClass('checked');
});
$(cbox).bind('change', function() {
$(beautifulCheckbox)[cbox.checked ? "addClass" : "removeClass"]('checked');
});
$(cbox).after(beautifulCheckbox);
});
};
};
var FormValidator = function() {
this.prepareValidation = function(cb) {
$(document).ready(function() {
$('.v_form_validate').submit(function(e) {
e.preventDefault();
var validForm = true;
$(this).find('.v_validate ').each(function() {
var validField = true;
// If a field : text, textarea
if ($(this).attr('type') == 'text' ||
$(this).attr('type') == 'textarea' ||
$(this).attr('type') == 'email' ||
$(this).attr('type') == 'password') {
if ($(this).attr('required') && $(this).val().length == 0) {
validField = false;
}
// Min and maxlength verification
if ($(this).attr('minlength') && $(this).val().length < $(this).attr('minlength')) {
validField = false;
} else if ($(this).attr('maxlength') && $(this).val().length > $(this).attr('maxlength')) {
validField = false;
}
}
if ($(this).attr('type') == 'checkbox' && $(this).attr('required') && !$(this).is(':checked')) {
validField = false;
}
if ($(this).attr('type') == 'number') {
// Min and maxlength verification
if ($(this).attr('min') && $(this).val() < $(this).attr('min')) {
validField = false;
} else if ($(this).attr('max') && $(this).val() > $(this).attr('max')) {
validField = false;
}
}
$('[ckeditor]').val($('[ckeditor]').ckeditor().getData());
if (!validField) {
validForm = validField;
}
if (!validField) {
$(this).removeClass('v_valid');
$(this).addClass('v_invalid');
} else {
$(this).removeClass('v_invalid');
$(this).addClass('v_valid');
}
});
if (validForm) {
// Send via ajax
processForm($(this));
}
return false;
});
var processForm = function(form) {
var that = this;
var serialized_form = form.serialize();
// Process files
processFiles(form, function() {
$.post(form.attr('action') || window.location.href.toString(), serialized_form, function(data) {
if (data.success && data.redirect) {
window.location.replace(data.redirect);
}
var event = new CustomEvent('formSubmited', {
'detail': data
});
document.dispatchEvent(event);
return false;
});
if (cb) cb();
});
return false;
};
var processFiles = function(form, cb) {
if (form.find('input[type=file]').length > 0) {
var data = new FormData();
jQuery.each(form.find('input[type=file]')[0].files, function(i, file) {
data.append('file-' + i, file);
});
jQuery.ajax({
url: form.attr('action'),
data: data,
cache: false,
contentType: false,
processData: false,
type: 'POST',
success: function(data) {
return cb();
}
});
} else {
return cb();
}
};
});
};
}
var LocalCache = function() {
var cache = window.localStorage;
this.cacheForm = function() {
};
this.fillFormFromCache = function(formName) {
};
this.setVar = function(key, value) {
window.localStorage.setItem(key, value);
};
this.getVar = function(key) {
var item = window.localStorage.getItem(key);
return item == null ? undefined : item;
};
cache.forms = cache.forms || new Object();
cache.adminmenus = cache.adminmenus || new Object();
};
var findPushTableFromTitle = function(title) {
var pt = undefined;
for (var i = 0; i < pushtables.length; i++) {
if (pushtables[i].title == title) {
pt = pushtables[i];
break;
}
}
return pt;
}
var fillFormFromSource = function(src, data, index) {
index = typeof index == 'undefined' ? 0: index;
var form = $('form[name="' + src + '"]:nth-of-type('+ index+1 +')');
// Check for stacktable
$(form).find('table.lmlstacktable').each(function(index, osTable) {
sTable = $(osTable);
var stackTable = new StackTable(
sTable.attr('id'),
sTable.data('title'),
JSON.parse(osTable.dataset.scheme.replace(/\&lmlquote;/g, '"'))
);
stackTable.appendRow(data);
});
var foreachloop = function(data, kString) {
for (var key in data) {
var kkString = kString + (kString == "" ? "" : ".") + key;
var val = data[key];
var pt = undefined;
if (typeof val === "object") {
foreachloop(val, kkString);
} else {
var field = form.find('*[name="' + kkString + '"]');
if (field.length > 0) {
if (field.attr('type') == 'checkbox') {
field.get(0).checked = val === true;
} else {
field.val(val);
}
} else if ((pt = findPushTableFromTitle(kkString))) {
pt.fillFromSource(val);
}
}
}
}
if (form.length != 0) {
foreachloop(data, "");
}
};
var FormParser = function() {
var makeSingleStackTable = this.makeSingleStackTable = function(index, osTable) {
sTable = $(osTable);
var stackTable = new StackTable(
sTable.attr('id'),
sTable.data('title'),
JSON.parse(osTable.dataset.scheme.replace(/\&lmlquote;/g, '"'))
);
osTable.dataset.stacktableindex = index;
stacktables.push(stackTable);
};
var makeStackTables = function() {
$('.lmlstacktable').each(makeSingleStackTable);
};
this.parse = function(selector) {
$("form").deserialize(livevars[selector][0]);
};
this.init = function() {
makeStackTables();
};
};
var StackTable = function(tableid, objTitle, dataScheme) {
var htmlIdentifier = tableid;
var scheme = dataScheme;
var fieldName = dataScheme.fieldName;
var title = objTitle;
var linenumber = 0;
var that = this;
var render = function() {
// Check for livevars
}
$('#' + htmlIdentifier).find('.lmlstacktableappendbutton').bind('click', function() {
that.appendRow();
return false;
});
var append = function(val, index) {
var row = "<tr>";
row += "<td>" + val + "</td>";
row += "<input type='hidden' name='"+ $('#' + htmlIdentifier).data('fieldname') +"["+linenumber+"]["+ scheme.columns[index].fieldName +"]' value='"+  val +"'></input>";
row += "<td><button class='lmlstacktableremovebutton'>Remove</button></td>";
row += "</tr>";
$('#' + htmlIdentifier).find('tr').last().after(row);
$('#' + htmlIdentifier).find('.lmlstacktableremovebutton').bind('click', function() {
$(this).parent().parent().remove();
});
linenumber ++;
return false;
}
this.appendRow = function(livevar) {
$('.lmlstacktable th input').each(function(index) {
if (livevar) {
var data = livevar[$(this).data('fieldname')];
append(data);
} else {
append($(this).val(), index);
$(this).val('');
}
});
return false;
}
var init = function() {
render();
};
init();
};
var PushTable = function(tableid, objTitle, dataScheme, dataSource) {
var datasrc = dataSource;
var html = "";
var scheme = JSON.parse(dataScheme.replace(/&lmlquote;/g, '"'));
var schemeCol = new Object();
var htmlIdentifier = tableid;
var that = this;
var rows = new Object();
var selectkeys = new Object();
this.id = tableid;
this.title = objTitle;
this.rendered = false;
var findColByFieldName = function(fieldName) {
var col = undefined;
for (var i = 0; i < scheme.columns.length && !col; i++) {
if (scheme.columns[i].fiendName == fieldName) {
col = scheme.columns[i];
}
}
return col;
};
this.getSchemeCol = function() {
return schemeCol;
};
this.bindEvents = function() {
if (this.rendered) {
$('#' + htmlIdentifier).find('.lmlpushtablekeyer').bind('change', function() {
return that.selectChanged(this);
});
$('#' + htmlIdentifier).find('.lmlpushtablecolumnaddaction').bind('click', function() {
return that.appendRow()
});
for (var i = 0; i < scheme.columns.length; i++) {
var col = scheme.columns[i];
if (typeof col.influence !== 'undefined') {
(function(col) {
$('.lmlpushtablecolumnfield-' + col.fieldName).bind('change', function() {
var affectedField = $('.lmlpushtablecolumnfield-' + col.influence.fieldName);
var newValue = parseInt(affectedField.data("initvalue"));
switch (col.influence.eq) {
case "+":
newValue += parseInt($(this).val());
break;
case "-":
newValue -= parseInt($(this).val());
break;
case "*":
newValue *= parseInt($(this).val());
break;
case "/":
newValue /= parseInt($(this).val());
break;
case "=":
newValue = $(this).val();
break;
}
affectedField.val(newValue);
});
})(col);
}
}
} else {
throw "Tried to apply bindings on a PushTable that was not yet rendered. Identifier : " + this.htmlIdentifier;
}
this.selectChanged();
};
this.rowToHTML = function(row) {
var _h = '<tr class="lmlpushtableaddedrow" id="' + row._rowID + '" data-value="' + row['_lmlid'] + '"><td>' +
'<b>' + row['_title'] + '</b><input type="hidden" name="' + tableid + '[' + row._rowID + '][prodid]" value="' + row['_lmlid'] + '" /></td>';
var validRow = true;
var er = undefined;
for (var key in row) {
if (key[0] != "_") {
if (schemeCol[key].autocomplete) {
// Check for column in templates
var livevarValue = livevars[schemeCol[key].autocomplete.datasource];
var required = schemeCol[key].required;
var isEmpty = row[key].trim() == "";
var foundObject = undefined;
if (isEmpty && !required) {
foundObject = new Object();
foundObject[schemeCol[key].autocomplete.keyName] = "-";
} else {
for (var i = 0; i < livevarValue.length; i++) {
if (livevarValue[i][schemeCol[key].autocomplete.keyValue] == row[key]) {
foundObject = livevarValue[i];
break;
}
}
}
if (foundObject) {
_h += '<td><span>' + foundObject[schemeCol[key].autocomplete.keyName] + '</span><input type="hidden" name="' +
tableid + '[' + row._rowID + '][' + key + ']" value="' + row[key] + '" /></td>';
} else {
validRow = false;
er = new Error("Invalid Row");
er.invalidRow = key;
break;
}
} else {
_h += '<td><span>' + row[key].toString() + '</span><input type="hidden" name="' +
tableid + '[' + row._rowID + '][' + key + ']" value="' + row[key] + '" /></td>';
}
}
}
return validRow ? _h + '<td><button class="lmlpushtableremovebutton">Remove</button></td></tr>' : er;
};
this.removeDeleteRow = function(rowID) {
$('#' + rowID).remove();
delete rows[rowID];
that.updateFooter();
return false;
};
this.fillFromSource = function(sourceObj) {
for (var i = 0; i < sourceObj.length; i++) {
this.appendRow(sourceObj[i]);
}
}
this.appendRow = function(sourceObj) {
var row = new Object();
row._rowID = "row" + Math.random().toString(36).slice(-12);
if (sourceObj) {
var readKey = scheme.key.readKey || scheme.key.keyValue;
var keyIndex = sourceObj[readKey];
var keyObject = datasrc[keyIndex];
row._lmlid = keyObject[scheme.key.keyValue];
row._title = keyObject[scheme.key.keyName];
for (var k in sourceObj) {
if (k != readKey) {
row[k] = sourceObj[k];
}
}
} else {
row['_lmlid'] = $('#' + htmlIdentifier).find('.lmlpushtablekeyer').val();
row['_title'] = $('#' + htmlIdentifier).find('.lmlpushtablekeyer option:selected').html();
$('#' + htmlIdentifier).find('.lmlpushtablecolumnfield:not(.lmlpushtablecasenotmet)').each(function(index, val) {
var fieldname = $(this).data('fieldname');
if ($(this).prop('autocomplete') == 'on') {
row[fieldname] = $('#' + $(this).attr('list')).find('option[value="' + $(this).val() + '"]').html() || $(this).val();
} else {
row[fieldname] = $(this).val();
}
});
}
rows[row._rowID] = row;
(function(rowID) {
if (htmlRow instanceof Error) {
var rowKey = htmlRow.invalidRow;
// TODO : show error message
} else {
var htmlRow = that.rowToHTML(row);
$('#' + htmlIdentifier).find('tbody').append(htmlRow)
.find('tr').last().find('.lmlpushtableremovebutton').bind('click', function() {
that.removeDeleteRow(rowID);
});
}
})(row._rowID);
that.updateFooter();
return false;
};
var findTemplateFieldFromDisplayCase = function(templateid, src) {
var colTemp = scheme.columnTemplates[templateid];
var dependsOn = colTemp.dependsOn;
var valToVerify = src[dependsOn];
var possibleFields = colTemp.fields;
var fieldFound = undefined;
var defaultField = undefined;
for (var ctn = 0; ctn < possibleFields.length; ctn++) {
var posFld = possibleFields[ctn];
if (posFld.displayCase == valToVerify) {
fieldFound = posFld;
} else if (posFld.displayCase == "*") {
defaultField = posFld;
}
}
if (!fieldFound && defaultField) {
fieldFound = defaultField;
}
return fieldFound;
};
this.selectChanged = function(select) {
var key = $(select || ("#" + htmlIdentifier + " .lmlpushtablekeyer option:selected")).val();
var src = datasrc[key];
$('#' + htmlIdentifier).find('.lmlpushtablecolumnfield').each(function(index, val) {
var dataKeyName = $(this).data('keyname');
var defaultValue = $(this).data('defaultvalue');
var displayif = $(this).data('displayif');
if (typeof displayif !== 'undefined' && typeof window[displayif] == 'function') {
if (window[displayif].apply(key, [key])) {
//Hide the selection
$(this).show();
} else {
//Hide the selection
$(this).hide();
}
}
$(this).val(dataKeyName ? src[dataKeyName] : defaultValue).data("initvalue", $(this).val());
});
$('#' + htmlIdentifier).find('.lmlpushtableheadertitlesrow .pushtablecolumntemplatereactive').each(function(index, th) {
var foundField = findTemplateFieldFromDisplayCase($(th).data('templateid'), src);
$(th).html(foundField ? (foundField.displayName || foundField.fieldName) : "-");
});
$('#' + htmlIdentifier).find('.lmlpushtableheaderfieldsrow .lmlpushtabletemplatereactiverow').each(function(index, th) {
var foundField = findTemplateFieldFromDisplayCase($(th).data('templateid'), src);
$(th).children().addClass('lmlpushtablecasenotmet');
$('.lmlpushtablecolumnfield-' + foundField.fieldName).removeClass('lmlpushtablecasenotmet');
});
return false;
};
this.render = function() {
this.rendered = true;
return html;
};
this.updateFooter = function() {
if (scheme.footer) {
var table = $('#' + htmlIdentifier);
table.find('tfoot tr td:gt(0)').each(function(index, col) {
if (scheme.footer.sumIndexes.indexOf(index) !== -1) {
var colScheme = scheme.columns[index];
var total = 0;
for (var rowID in rows) {
total += parseInt(rows[rowID][colScheme.fieldName]);
}
$(col).html(total + (colScheme.prepend || ""))
}
});
}
return false;
};
this.init = function() {
html += '<table id="' + tableid + '" class="lmlpushtable lmldatasourcetable" data-title="'+this.title+'"><thead><tr class="lmlpushtableheadertitlesrow"><th>' +
scheme.key.displayName + '</th>'
for (var i = 0; i < scheme.columns.length; i++) {
html += '<th class="pushtablecolumnheader'+
(scheme.columns[i].dataType == "template" ? " pushtablecolumntemplatereactive" : "") +
'" '+ (scheme.columns[i].templateid ? 'data-templateid="'+scheme.columns[i].templateid+'"' : "")+
'>' + (scheme.columns[i].displayName || "") + "</th>";
}
html += '<th></th></tr><tr class="lmlpushtableheaderfieldsrow"><th><select class="lmlpushtablekeyer">';
for (var key in dataSource) {
var dat = dataSource[key];
html += '<option class="lmlpushtableoptionkey" value="' + dat[scheme.key.keyValue] + '">' + dat[scheme.key.keyName] + '</option>';
selectkeys[dat[scheme.key.keyValue]] = dat[scheme.key.keyName];
}
html += '</select></th>';
var addHeaderField = function(col) {
html += '<input class="lmlpushtablecolumnfield lmlpushtablecolumnfield-' + col.fieldName + (col.displayCase ? " lmlpushtablecasenotmet lmlpushtabletemplatereactive" : "") + '" type="' + (col.dataType || "text") +
'" data-fieldname="' + col.fieldName +
(col.keyName ? '" data-keyname="' + col.keyName : "") +
(col.displayCase ? '" data-displaycase="' + col.displayCase : "") +
(col.defaultValue ? '" data-defaultvalue="' + col.defaultValue : "");
if (col.autocomplete) {
html += '" list="' + tableid + col.fieldName + 'list" autocomplete="on" data-acsource="' + col.autocomplete.datasource + '"';
}
html += '" />';
if (col.autocomplete && col.autocomplete.datasource) {
var datVar = livevars[col.autocomplete.datasource];
if (datVar && datVar.length) {
html += '<datalist id="' + tableid + col.fieldName + 'list">';
for (var j = 0; j < datVar.length; j++) {
html += '<option  value="' + datVar[j][col.autocomplete.keyName] + '">' + datVar[j][col.autocomplete.keyValue] + '</option>';
}
html += '</datalist>';
}
}
}
for (var i = 0; i < scheme.columns.length; i++) {
var col = scheme.columns[i];
schemeCol[col.fieldName] = col;
if (col.dataType == "template") {
html += '<th class="lmlpushtabletemplatereactiverow" data-templateid="'+col.templateid+'">';
var colTemplate = scheme.columnTemplates[col.templateid];
colTemplate.fields.forEach(function(tempField) {
addHeaderField(tempField);
});
} else {
html += "<th>";
addHeaderField(col);
}
html += "</th>"
}
for (var tempKey in scheme.columnTemplates) {
var tempCols = scheme.columnTemplates[tempKey];
for (var j = 0; j < tempCols.fields.length; j++) {
schemeCol[tempCols.fields[j].fieldName] = tempCols.fields[j];
}
}
html += '<th><button class="lmlpushtablecolumnaddaction">Add</button></th>' +
'</tr></thead><tbody></tbody>';
if (scheme.footer) {
html += '<tfoot><tr><td>' + scheme.footer.title + '</td>';
for (var i = 0; i < scheme.columns.length; i++) {
if (scheme.footer.sumIndexes.indexOf(i) !== -1) {
html += '<td>0' + (scheme.columns[i].prepend || "") + '</td>'
} else {
html += '<td></td>';
}
}
html += '<td></td></tr></tfoot>';
}
html += '</table>';
document.addEventListener(LiliumEvents.livevarsRendered.name, function() {
that.bindEvents();
});
};
this.init();
};
document.addEventListener(LiliumEvents.livevarsFetched.name, function(e) {
$('.dropdown-menu #avatar img').attr('src', liliumcms.livevars.livevars().session.avatarURL);
});
// Notifications
document.addEventListener(LiliumEvents.livevarsRendered.name, function(e) {
var session = e.detail.livevars.session
// Subscribe to channels based on user roles
if (session) {
for (var index in session.roles) {
// Join socket channel
socket.join(session.roles[index]);
}
}
if (session && session.notifications) {
var notifs = session.notifications;
var notificationList = $('.nav > .dropdown #notification-dropdown #notification_list');
var nbUnviewed = session.newNotifications ? session.newNotifications : 0;
for (var index in notifs) {
// Update small counter
var notifHtml = generateNotification(notifs[index]);
notificationList.prepend(notifHtml);
}
// Update notification badge
if (nbUnviewed == 0) {
$('.dropdown .dropdown-toggle .badge').hide();
} else {
$('.dropdown .dropdown-toggle .badge').html(nbUnviewed);
}
// Update time for notifications
$("time.timeago").timeago();
$('body').on('click', '#notification_list li', function(e) {
e.preventDefault();
if ($(this).hasClass('new')) {
$(this).removeClass('new');
socket.emit('notification-interaction', $(this).attr('id'));
}
if ($(this).data('href')) {
window.location.href = $(this).data('href');
} else {
$('.dropdown.open .dropdown-toggle').dropdown('toggle');
}
});
$('#dropdown-notification').on('click', function () {
var badge = $('.dropdown .glyphicon .badge');
if ($(badge).is(":visible")) {
}
socket.emit('notification-view', {});
// Hide badge
badge.html(0);
badge.hide();
});
}
});
var generateNotification = function(notif) {
var isNew = typeof notif.interacted !== 'undefined' && !notif.interacted? "new" : "";
var type = notif.type ? notif.type : "info";
var link = notif.url? "data-href='" + notif.url + "'": "";
var title = notif.title ? "<div class='notif-title'>"+ notif.title +"</div>" : "";
var msg = notif.msg ? notif.msg : "Empty Notification :(";
var date = notif.date? "<time class='date timeago' datetime='"+ notif.date.toString() +"'>" + notif.date +"</time>" : '';
var html = "<li id='" + notif._id + "' class='" + isNew + ' ' + type + " link' " + link +"><div>"+ title + "<div class='notif-msg'>" + msg + '</div>' + date +"</div></li>";
return html;
};
if (typeof io !== "undefined") {
io.Socket.prototype.join = function(groupName) {
this.emit('join', groupName);
};
io.Socket.prototype.emitToGroup = function(groupName, data) {
this.emit('emittogroup', {group: groupName, data: data});
};
io.Socket.prototype.notifyURL = function(groupName, data) {
this.emit('urlChanged', window.location.href);
};
socket.notifyURL();
socket.on('join', function(data){
if (!data.success) {
console.error('[Notifications] ' + data.group + ' : ' + data.msg);
} else {
console.log('Join success : ' + data.group);
}
});
socket.on('group', function(data) {
if (debugMode){
console.log('[Notification] Message from group "' + data.group + '" : ' + data.msg);
}
});
socket.on('debug', function(data){
if (debugMode){
console.log('[Notification] ' + data.msg);
}
})
socket.on('err', function(data) {
console.error('[Notification] ' + data.msg);
});
socket.on('notification', function(notification) {
var notif = generateNotification(notification);
var badge = $('.dropdown .dropdown-toggle .badge');
$('#notification_list').prepend(notif);
$(badge).html(parseInt(badge.html()) + 1);
$(badge).show();
// Update time for notifications
$("time.timeago").timeago();
notification.type = typeof notification.type !== 'undefined'? notification.type : 'info';
notification.message = notification.msg ? notification.msg : 'Notification without a message :(';
that.notify(notification);
});
}
var deepUnescape = function(json) {
for (var index in json) {
switch (typeof json[index]) {
case 'string':
json[index] = unescape(json[index]);
break;
case 'object':
json[index] = deepUnescape(json[index]);
break;
}
}
return json;
};
this.notify = function (notification) {
$.notify(notification, {
type: notification.type,
newest_on_top: true,
delay: -1,
animate: {
enter: 'animated fadeInUp',
exit: 'animated fadeOutDown'
},
placement: {
from: "bottom",
align: "right"
},
template: '<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">x</button>' +
'<span data-notify="icon"></span> ' +
'<span data-notify="title"><b>{1}: </b></span> ' +
'<span data-notify="message">{2}</span>' +
'<div class="progress" data-notify="progressbar">' +
'<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
'</div>' +
'<a href="{3}" target="{4}" data-notify="url"></a>' +
'</div>'
});
}
var AdminMenu = function() {
this.init = function() {
var currentHref = window.location.href;
var looping = true;
$('.lmladminsidebaritems li').each(function(index, li) {
if (looping) {
li = $(li);
var href = li.find('a').attr('href');
if (currentHref.indexOf(href) !== -1) {
li.addClass('lmladminsidebarselected');
looping = false;
}
}
});
};
};
var QueryParams = function() {
this.parseURL = function() {
var querystring = window.location.href.split("?");
if (querystring.length > 1) {
var unescapedParams = querystring[1].split('&');
for (var i = 0; i < unescapedParams.length; i++) {
var split = unescapedParams[i].split('=');
queryParams[split.shift()] = unescape(split.join('='));
}
liliumcms.queryparams.parseHTML();
}
};
this.parseHTML = function() {
$('lml\\:queryparam').each(function(index, qTag) {
var urlval = queryParams[$(qTag).data('param')];
if (urlval) {
$(qTag).find('lml\\:tobject').each(function(index, tobj) {
$(tobj).after(queryParams[$(tobj).data("querystring")]);
$(tobj).remove();
});
$(qTag).after(qTag.innerHTML);
}
$(qTag).remove();
});
};
}
var Hooks = function() {
};
var LMLHTML5 = function() {
var init = function() {
};
init();
};
this.everythingIsAwesome = function() {
$('body').addClass('lmlrendered');
};
var AwesomeStrapper = function() {
this.strap = function() {
var livevars = new LiveVars();
var lmlhtml5 = new LMLHTML5();
livevars.exec();
};
};
this.queryparams = new QueryParams();
this.formvalidator = new FormValidator();
this.awesomestrapper = new AwesomeStrapper();
this.formParser = new FormParser();
this.livevars = new LiveVars();
ckeditor = typeof CKEditor !== 'undefined' ? new CKEditor() : undefined;
this.adminmenu = new AdminMenu();
this.formbeautifier = new FormBeautifier();
document.addEventListener('livevarsRendered', function(e) {
liliumcms.queryparams.parseURL();
ckeditor ? ckeditor.initEditor() : false ;
liliumcms.formbeautifier.beautify();
liliumcms.formParser.init();
liliumcms.adminmenu.init();
liliumcms.everythingIsAwesome();
});
// API
this.refresh = function() {
window.location.reload();
};
var init = function() {
var pathname = window.location.pathname;
var split = pathname.split('?')[1];
window.location.params = new Object();
if (split) {
split = split.split('&');
for (var i = 0; i < split.length; i++) {
var keyVal = split[i].split('=');
window.location.params[keyVal[0]] = keyVal[1];
}
}
};
init();
};
var liliumcms = new LiliumCMS();
$(function() {
liliumcms.awesomestrapper.strap();
});
