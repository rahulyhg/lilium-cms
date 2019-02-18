var livevars = require('../livevars.js');
var db = require('../lib/db.js');

// Search schemas
var queriedCollections = new Array();
var outputFormats = new Object();

// Backend search class
var BackendSearch = function() {};

BackendSearch.prototype.registerLiveVar = function() {
    livevars.registerLiveVariable('backendsearch', livevarExec, 'dash');
};

// scheme : [ {field: '', displayName: ''}, ... ]
BackendSearch.prototype.registerSearchFormat = function(collectionInfo, scheme) {
    queriedCollections.push(collectionInfo);
    outputFormats[collectionInfo.collection] = scheme;
};

var livevarExec = function(cli, levels, params, callback) {
    // Fetching query 
    var query = params.q;
    var queryBlocks = query.split(' ');
    var regexArr = new Array();    

    // Getting parts longer than 2 characters
    for (var i = 0, len = queryBlocks.length; i < len; i++) {
        if (queryBlocks[i].length >= 3) {
            regexArr.push(new RegExp(queryBlocks[i]));
        }
    }

    // Preparing queries
    var colReq = new Array;
    for (var i = 0, ilen = queriedCollections.length; i < ilen; i++) {
        var colinfo = queriedCollections[i];
        var col = colinfo.collection;
        var colReqi = new Object();
        colReqi.collection = col;
        colReqi.info = colinfo;
        colReqi.find = {
            '$or' : new Array()
        };
    
        for (var of in outputFormats[col]) {
            var pushedF = new Object();
            pushedF[of] = {
                $regex : query
            };
            colReqi.find['$or'].push(pushedF);
        }

        colReq.push(colReqi);
    }

    var index = 0;
    var results = new Object();
    results.scheme = outputFormats;
    results.data = new Object();

    var runNextRequest = function() {
        if (index < colReq.length) {
            var requestObj = colReq[index];
            var baseLink = requestObj.info.linkBase.replace("{adminurl}", cli._c.server.url + "/admin");

            db.findToArray(cli._c, requestObj.collection, requestObj.find, function(err, arr) {
                if (!err) {
                    results.data[requestObj.collection] = new Array();
                    for (var i = 0, len = arr.length; i < len; i++) {
                        var resObj = new Object();
                        var jFields = outputFormats[requestObj.collection];
                        for (var ff in jFields) if (!jFields[ff].backendOnly) {
                            resObj[ff] = arr[i][ff];
                        }

                        resObj._link = baseLink.replace("{$}", arr[i][requestObj.info.linkKey]);
     
                        results.data[requestObj.collection].push(resObj);
                    }
                } else {
                    results.data[requestObj.collection] = err;
                }

                index++;
                runNextRequest();
            });
        } else {
            callback(results);
        }
    };

    runNextRequest();
};

module.exports = new BackendSearch();
