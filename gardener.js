var config = require('./config.js');
var fileserver = require('./fileserver.js');
var cluster = require('cluster');
var RedisServer = require('redis-server');

var networkConfig = {loaded:false};
var garden = {};
var bootCount = 0;

var Gardener = function() {
    this.relConfigPath = "/network/gardener.json";    
    this.configPath = __dirname + this.relConfigPath;

    if (cluster.isMaster) {
        var that = this;
        this.loadConfig(function() {
            var redisserver = new RedisServer(6379);
            redisserver.open(function() {
                var lmlinstances = networkConfig.familysize || require('os').cpus().length;

                var server = require('http').createServer();
                var io = require('socket.io').listen(server);
                var redis = require('socket.io-redis');
    
                io.adapter(redis());
    
                for (var i = 0; i < lmlinstances; i++) {
                    var chld = cluster.fork({instancenum : i, parent : "gardener"});
                    chld.instancenum = i;
                    garden[chld.process.pid] = chld;
                    chld.on('message', that.broadcast);
                    bootCount++;
                }

                cluster.on('online', function(worker) {
                    console.log('Worker ' + worker.process.pid + ' is online');
                });

                cluster.on('exit', function(worker, code, signal) {
                    console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
                    console.log('Starting a new worker');
                    var dyingChld = garden[worker.process.pid];
                    var chld = cluster.fork({instancenum : dyingChld.instancenum});
                    chld.on('message', that.broadcast);

                    delete garden[worker.process.pid];
                    garden[chld.process.pid] = chld;
                    bootCount++;
                }); 
            });       
        });
    } else {
        var lilium = require('./lilium.js');
        garden[process.id] = lilium;
    } 
};

Gardener.prototype.broadcast = function(m) {
    var senderpid = m.sender;
    if (!senderpid) {
        return;
    }

    for (var pid in garden) if (pid != senderpid || m.sendback) {
        garden[pid].send({
            type : m.type,
            payload : m.payload,
            from : senderpid
        });
    }
};

Gardener.prototype.loadConfig = function(cb) {
    fileserver.readJSON(this.configPath, function(json) {
        networkConfig = json;
        cb();
    }, false);
}

Gardener.prototype.define = function() {
    server = http.createServer(this.helloClient);
    io = require('socket.io')(server);
};

Gardener.prototype.openProxy = function() {
    
}

Gardener.prototype.spinThatShitDJ = function() {
    
};

var lmlnetwork = new Gardener();
