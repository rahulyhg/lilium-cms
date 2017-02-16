var lmllib = require('./lmllib.js');
var hooks = require('./hooks.js');
var pluginHelper = require('./pluginHelper.js');

var TableBuilder = function () {
    var that = this;

    lmllib.registerContextLibrary('tableBuilder', function () {
        return that;
    });

    var tables = {};

    this.createTable = function (table) {
        if (typeof tables[table.name] == 'undefined') {
            tables[table.name] = table;
            tables[table.name].pluginID = pluginHelper.getPluginIdentifierFromFilename(__caller, undefined, true);
        } else {
            return new Error ('[TableBuilder] Table with name ' + table.name + ' already exists.');
        }
    };

    this.render = function (tableName) {
        if (typeof tables[tableName] !== 'undefined') {
            return generatehtml(tables[tableName]);
        } else {
            return new Error ('[TableBuilder] Table with name ' + tableName + ' not found.');
        }
    };

    deletePluginTable = function(identifier) {
        for (var i in tables) {
            if (tables[i].pluginID == identifier) {
                tables[i] = undefined;
                delete tables[i];
            }
        }
    }

    var loadHooks = function () {
        hooks.bind('plugindisabled', 2, function(identifier) {
            // Check if plugin changed some forms
            deletePluginTable(identifier);
        });
    };

    var generatehtml = function (table) {
        var sortbyKey = (table.sortby || findFirstSortable(table) || '');
        var sortOrder = (typeof table.sortorder == "undefined" ? 1 : table.sortorder);
        var html = '';
        var pages = [(table.max_results || 20), (typeof table.max_results !== 'undefined' && table.max_results !== 20 ? 20 : 40), (typeof table.max_results !== 'undefined' ? 40 : 60), (typeof table.max_results !== 'undefined' ? 60 : 100)];
        pages.sort(function (a, b) {
            return a - b
        });
        html += '<div class="lmltablebuilder tablewrapper">';
        html += '<div class="lmltablebuilder header">';
        html += '<div class="lmltablefilters">';
        if (table.filters) {
            for (var filtername in table.filters) {
                var filter = table.filters[filtername];
                html += '<div class="lmltablefilter"><b>' + filter.displayname || filtername + '</b> : ';
                html += '<select name="'+filtername+'" ';
                if (filter.livevar) {
                    html += ' class="lmlfilterlivevar" ' +
                            ' data-livevar="'+filter.livevar.endpoint+'" ' +
                            ' data-livevarkey="'+filter.livevar.value+'"' +
                            ' data-livevardisplay="'+filter.livevar.displayname+'"'; 
                }
                html += '><option value="">All</option>';

                if (filter.datasource) {
                    for (var i = 0; i < filter.datasource.length; i++) {
                        html += '<option value="'+filter.datasource[i].value+'">'+filter.datasource[i].displayname+'</option>';
                    }
                } 
                html += '</select>';
                html += '</div>';
            }
        }
        html += '</div>';
        html += '<div class="search pull-right"><label>Search : </label><input type="text" name="search-table" class="search-table"></div>';
        html += '</div>';
        html += '<table class="lmltablebuilder lmlfullwidthtable" id=' + table.name + ' data-endpoint="' + table.endpoint + '" data-max="' + (table.max_results || 20) + '" data-page="1" data-sort-order="'+sortOrder+'" data-sortby="' + sortbyKey + '">';
        html += '<thead>';
        html += '<tr>';
        for (var i in table.fields) {
            var sorted = sortbyKey == table.fields[i].sortkey || sortbyKey == table.fields[i].key;
            html += '<th data-generator="' + (table.fields[i].generator) + '" ' + (table.fields[i].sortable ? 'sortable' : '') + ' style="'+ (table.fields[i].fixedWidth ? ("width:" + table.fields[i].fixedWidth + "px;") : "")+'" class="'+  (sorted ? 'sorted-asc ' : "" ) + (table.fields[i].classes || "") + '" ' + (sorted ? 'sorted="true"' : "") + (table.fields[i].sortkey ? 'data-sortkey="' + table.fields[i].sortkey + '"' : '') + ' data-key="' + (table.fields[i].key || '') + '" ' + (typeof table.fields[i].template !== 'undefined' ? 'data-template="' + table.fields[i].template + '"' : '') + '>' + (table.fields[i].displayname || table.fields[i].key) + '</th>';
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

    this.init = function() {
        loadHooks();
    }
};

module.exports = new TableBuilder();
