var mysql = require('mysql');
var log = require('../log.js');
var db = require('./db.js');

var tables = ["wp_users", "wp_usermeta", "wp_postmeta", "wp_posts", "wp_options"];

var WPDump = function() {};

WPDump.prototype.dump = function(cli, mysqldb, done) {
    var index = 0;
    var len = tables.length;
    var next = function() {
        if (index == len) {
            done();
            return;
        }
        
        var tb = tables[index];
        console.log('Sending queries...');

        var connection = mysql.createConnection({
            host: mysqldb.host,
            port: mysqldb.port,
            user: mysqldb.user,
            password: mysqldb.password
        });

        connection.connect();

        console.log("Querying " + tb + "...");
        var limit = 1000;
        var offset = 0;

        var limitUp = function() {
            connection.query('select * from '+mysqldb.dbname+'.'+tb+' LIMIT ' + offset + ', ' + limit + ';', function(err, results, fields) {
                if(err) {
                    console.log('Error : ' + err);
                    connection.end();
                    index++;
                    setTimeout(next, 1);

                    return;
                } else if (results.length == 0) {
                    connection.end();
                    index++;
                    setTimeout(next, 1);

                    return;
                };

                db.insert(cli._c, tb, results, function() {
                    offset += limit;
                    setTimeout(limitUp, 1);
                });
            });
        };

        db.createCollection(cli._c, tb, function() {
            setTimeout(limitUp, 1);
        });
    };
    
    setTimeout(next, 1);
}

module.exports = new WPDump();
