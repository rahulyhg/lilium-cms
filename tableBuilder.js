var lmllib = require('./lmllib.js');

var TableBuilder = function () {
	lmllib.registerContextLibrary('tableBuilder', function() {return require('./tableBuilder');});

	var tables = {};

	this.createTable = function(table) {
		if (typeof tables[table.name] == 'undefined') {
			tables[table.name] = table;
		} else {
			throw('[TableBuilder] Table with name ' +tableName + ' already exists.');
		}
	};

	this.render = function(tableName) {
		if (typeof tables[tableName] !== 'undefined'){
			return generatehtml(tables[tableName]);
		} else {
			throw('[TableBuilder] Table with name ' +tableName + ' not found.');
		}
	};

	var generatehtml = function(table) {
		var html = '';
		html += '<table class="lmltablebuilder lmlfullwidthtable" id=' + table.name + ' data-endpoint="' + table.endpoint + '" data-max="' + (table.max_results || 20) + '" data-page="1" data-sortby="'+ (table.sortby || table.fields[0].key || '') +'">';
		html += '<thead>';
		html += '<tr>';
		for (var i in table.fields) {
			html += '<th ' + (table.fields[i].sortable ? 'sortable' : '' )  +' data-key="'+ (table.fields[i].key || '') +'" ' + (typeof table.fields[i].template !== 'undefined' ? 'data-template="' + table.fields[i].template + '"' : '' ) + '>' + (table.fields[i].displayname || table.fields[i].key ) + '</th>';
		}
		html += '</tr>';
		html += '</thead>';
		html += '<tbody></tbody>';
		html += '</table>';
		return html;
	};
};

module.exports = new TableBuilder();
