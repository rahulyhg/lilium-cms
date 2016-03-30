var lmllib = require('./lmllib.js');

var TableBuilder = function () {
    lmllib.registerContextLibrary('tableBuilder', function () {
        return require('./tableBuilder');
    });

    var tables = {};

    this.createTable = function (table) {
        if (typeof tables[table.name] == 'undefined') {
            tables[table.name] = table;
        } else {
            throw ('[TableBuilder] Table with name ' + tableName + ' already exists.');
        }
    };

    this.render = function (tableName) {
        if (typeof tables[tableName] !== 'undefined') {
            return generatehtml(tables[tableName]);
        } else {
            throw ('[TableBuilder] Table with name ' + tableName + ' not found.');
        }
    };

    var generatehtml = function (table) {
        var sortbyKey = (table.sortby || findFirstSortable(table) || '');
        var html = '';
        var pages = [(table.max_results || 20), (typeof table.max_results !== 'undefined' && table.max_results !== 20 ? 20 : 40), (typeof table.max_results !== 'undefined' ? 40 : 60), (typeof table.max_results !== 'undefined' ? 60 : 100)];
        pages.sort(function (a, b) {
            return a - b
        });
        html += '<div class="lmltablebuilder tablewrapper">';
        html += '<div class="lmltablebuilder header">';
        html += '<div class="max-per-pages">Show <select>';
        for (var i in pages) {
            html += '<option value="' + pages[i] + '" ' + (typeof table.max_results !== 'undefined' && table.max_results == pages[i] ? 'selected' : '') + '>' + pages[i] + '</option>';
        }
        html += '</select> entries</div>';
        html += '<div class="search pull-right"><label>Search : </label><input type="text" name="search-table"></div>';
        html += '</div>';
        html += '<table class="lmltablebuilder lmlfullwidthtable" id=' + table.name + ' data-endpoint="' + table.endpoint + '" data-max="' + (table.max_results || 20) + '" data-page="1" data-sort-order="1" data-sortby="' + sortbyKey + '">';
        html += '<thead>';
        html += '<tr>';
        for (var i in table.fields) {
            html += '<th ' + (table.fields[i].sortable ? 'sortable' : '') + ' '+ (sortbyKey == table.fields[i].sortkey || sortbyKey == table.fields[i].key ? 'class="sorted-asc" sorted="true" ' : '' ) +' ' + (table.fields[i].sortkey ? 'data-sortkey="' + table.fields[i].sortkey + '"' : '') + ' data-key="' + (table.fields[i].key || '') + '" ' + (typeof table.fields[i].template !== 'undefined' ? 'data-template="' + table.fields[i].template + '"' : '') + '>' + (table.fields[i].displayname || table.fields[i].key) + '</th>';
        }
        html += '</tr>';
        html += '</thead>';
        html += '<tbody></tbody>';
        html += '</table>';
        html += '<div class="lmltablebuilder footer"></div>';
        html += '</div>';
        return html;
    };
    var findFirstSortable = function(table) {
        for (var i in table.fields) {
            if (table.fields[i].sortable) {
                return (table.fields[i].sortkey || table.fields[i].key);
            }
        }

    };
};

module.exports = new TableBuilder();
