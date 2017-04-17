var config = require('./config.js');
var fileserver = require('./fileserver.js');
var cluster = require('cluster');
var RedisServer = require('redis-server');
var SharedMemory = require('./network/sharedmemory.js');
var log = require('./log.js');

var networkConfig = {loaded:false};
var garden = {};
var bootCount = 0;

var Gardener = function() {
    this.relConfigPath = "/network/gardener.json";    
    this.configPath = __dirname + this.relConfigPath;

    if (cluster.isMaster) {
        var that = this;
        
        log('Network', 'Loading network config', 'lilium');
        this.loadConfig(function() {
            log('Network', 'Network configuration loaded', 'success');
            log('Network', 'Spawning redis server', 'lilium');
            var redisserver = new RedisServer(6379);
            redisserver.open(function(a, b) {
                log('Network', 'Redis server spawned', 'success');
                var lmlinstances = networkConfig.familysize || require('os').cpus().length;

                log('Network', 'Starting up Shared Memory module', 'lilium');
                SharedMemory.bind();

                var server = require('http').createServer();
                var io = require('socket.io').listen(server);
                var redis = require('socket.io-redis');
    
                io.adapter(redis());
    
                log('Network', 'Starting ' + lmlinstances + ' processes', 'lilium');
                for (var i = 0; i < lmlinstances; i++) {
                    var chld = cluster.fork({instancenum : i, parent : "gardener"});
                    chld.instancenum = i;
                    garden[chld.process.pid] = chld;
                    chld.on('message', that.broadcast);
                    bootCount++;
                }

                cluster.on('online', function(worker) {
                    log('Network', 'Worker ' + worker.process.pid + ' is online', 'success');
                });

                cluster.on('exit', function(worker, code, signal) {
                    log('Network', 'Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal, 'err');
                    log('Network', 'Starting a new worker', 'info');
                    var dyingChld = garden[worker.process.pid];
                    var chld = cluster.fork({instancenum : dyingChld.instancenum, parent : "gardener"});
                    chld.on('message', that.broadcast);

                    delete garden[worker.process.pid];
                    garden[chld.process.pid] = chld;
                    bootCount++;
                    log('Network', 'Started a new worked with process ' + worker.process.pid, 'success');
                }); 
            });       
        });
    } else {
        var Lilium = require('./lilium.js');
        var lilium = new Lilium();
        garden[process.id] = lilium.cms();
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
