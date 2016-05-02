module.exports = function (_ready_) {
    var http = require('http');
    var log = require('./log');
    var fs = require('fs');
    var port = 8080;
    var qs = require('querystring');
    var db = require('./includes/db.js');

    log('Init', "Creating initialization temporary server");
    var parsePost = function (pd) {
        return pd.baseurl && pd.portnumber && pd.htmlpath &&
            pd.dbhost && pd.dbport && pd.dbuser &&
            pd.dbpass && pd.dbname;
    };

    var testDatabase = function (postdata, cb) {
        db.testConnectionFromParams(
            postdata.dbhost,
            postdata.dbport,
            postdata.dbuser,
            postdata.dbpass,
            postdata.dbname,
            cb
        );
    };

    var generateConfigObject = function (postdata, cb) {
        var conf = require('./config.js.dist');
        if (postdata.htmlpath[postdata.htmlpath.length - 1] == "/") {
            postdata.htmlpath = postdata.htmlpath.slice(0, -1);
        }

        if (postdata.baseurl[postdata.baseurl.length - 1] == "/") {
            postdata.baseurl = postdata.baseurl.slice(0, -1);
        }

        postdata.baseurl = "//" + postdata.baseurl.replace(/(https?\:)?\/\//, '');

        // Database 
        conf.default.data.host = postdata.dbhost;
        conf.default.data.port = postdata.dbport;
        conf.default.data.user = postdata.dbuser;
        conf.default.data.pass = postdata.dbpass;
        conf.default.data.use = postdata.dbname;

        // Server
        conf.default.server.base = __dirname + "/";
        conf.default.server.html = postdata.htmlpath;
        conf.default.server.url = postdata.baseurl;
        conf.default.server.port = postdata.portnumber;

        // Admin info
        conf.default.info.project = postdata.servername || "A Lilium Website";
        conf.default.website.sitetitle = conf.default.info.project;
        conf.default.emails.default = postdata.adminemail || "";
        conf.default.id = postdata.baseurl.replace('//', '');
        conf.default.uid = Math.random().toString().slice(2);

        if (!fs.existsSync(__dirname + "/sites/")) {
            fs.mkdirSync(__dirname + "/sites/");
        }

        var ws = fs.createWriteStream(__dirname + "/sites/default.json", {
            flags: 'w+',
            defaultEncoding: 'utf8'
        });

        ws.write(JSON.stringify(conf.default), 'utf8', function () {
            ws.end();
            cb();
        });
    };

    var handleRequest = function (req, resp) {
        var rs = fs.createReadStream(__dirname + "/backend/static/init.html");

        if (req.method == "GET") {
            rs.on('open', function () {
                rs.pipe(resp);
            });

            rs.on('close', function () {
                resp.end();
            });
        } else if (req.method == 'POST') {
            var postdata = "";

            req.on('data', function (chunk) {
                postdata += chunk;
            });

            req.on('end', function () {
                postdata = qs.parse(postdata);
                if (parsePost(postdata)) {
                    testDatabase(postdata, function (valid, err) {
                        if (valid) {
                            generateConfigObject(postdata, function () {
                                resp.redirectTo = postdata.baseurl + "/admin";
                                resp.server = server;
                                resp.req = req;

                                _ready_(resp);
                            });
                        } else {
                            resp.write('Database error : ' + err);
                            resp.end();
                        }
                    });
                } else {
                    resp.write('Invalid post.');
                    resp.end();
                }
            });
        } else {
            resp.writeHead(501, {
                'Content-Type': 'text/plain'
            });
            resp.write("501 NOT IMPLEMENTED");
        }
    };

    log('Init', 'Awaiting requests on port ' + port);
    var server = http.createServer(handleRequest);
    server.listen(port);

};
