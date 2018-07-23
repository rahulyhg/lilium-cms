const config = require('./config.js');
const fileserver = require('./fileserver.js');
const cluster = require('cluster');
const RedisServer = require('redis-server');
const fs = require('fs');
const log = require('./log.js');
const { spawn } = require('child_process');

const garden = {};

let sharedMemoryProcess;
let dataServerProcess;
let redisserver;
let bootCount = 0;

class Gardener {
    start() {
        if (cluster.isMaster) {
            require('./masthead.js');

            log('Network', 'Loading network config', 'lilium');
	        try {
                this.networkConfig = require('./sites/default.json').network;
	        } catch (err) {
                return this.fireupInitialServer();
            }

            log('Network', 'Network configuration loaded', 'success');
            log('Network', 'Spawning redis server', 'lilium');
            redisserver = new RedisServer(6379);

            this.spawnSharedMemory();
            this.spawnDataServer();
            redisserver.open(() => {
                log('Network', 'Redis server spawned', 'success');
                const lmlinstances = this.networkConfig.familysize || require('os').cpus().length;

                const server = require('http').createServer();
                const io = require('socket.io').listen(server);
                const redis = require('socket.io-redis');
    
                io.adapter(redis());
    
                log('Network', "Starting CAIJ", 'lilium');
                this.caijProc = cluster.fork({parent : "gardener", job : "caij", handleError : "crash"})
                this.caijProc.on('message', this.broadcast.bind(this));

                log('Network', 'Starting ' + lmlinstances + ' processes', 'lilium');
                for (let i = 0; i < lmlinstances; i++) {
                    const chld = cluster.fork({instancenum : i, parent : "gardener"});
                    chld.instancenum = i;
                    garden[chld.process.pid] = chld;
                    chld.on('message', this.broadcast.bind(this));
                    bootCount++;
                }

                cluster.on('online', worker => {
                    log('Network', 'Worker ' + worker.process.pid + ' is online', 'success');
                });

                cluster.on('exit', (worker, code, signal) => {
                    if (worker == this.caijProc) {
                        this.caijProc = cluster.fork({parent : "gardener", job : "caij", handleError : "crash"})
                        return this.caijProc.on('message', this.broadcast.bind(this));
                    }

                    log('Network', 'Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal, 'err');
                    log('Network', 'Starting a new worker', 'info');

                    const pid = worker.process.pid;
                    const dyingChld = garden[pid];
                    const chld = cluster.fork({instancenum : dyingChld.instancenum, parent : "gardener"});
                    chld.instancenum = dyingChld.instancenum;
                    chld.on('message', this.broadcast.bind(this));

                    delete garden[pid];
                    garden[chld.process.pid] = chld;
                    bootCount++;
                    log('Network', 'Started a new worked with process ' + worker.process.pid, 'success');
                }); 
            });
        } else {
            const Lilium = require('./lilium.js');
            const lilium = new Lilium();
            garden[process.id] = lilium.cms();
        } 
    }

    fireupInitialServer() {
        log('Network', 'Firing up initial server', 'lilium');
        require("./includes/initialserver").init(this.followupInitServer.bind(this));
    }

    followupInitServer() {
        this.start();
    }

    spawnSharedMemory() {
        log('Network', 'Spawning local cache server', 'lilium');
        if (sharedMemoryProcess) {
            sharedMemoryProcess.kill("SIGHUP");
        }
        sharedMemoryProcess = spawn("node", [__dirname + "/network/spawn.js"]);
        sharedMemoryProcess.on('error', err => {
            log('Gardener', err, 'err');
        })
    }

    spawnDataServer() {
        log('Network', 'Spawning dataserver', 'lilium');
        if (dataServerProcess) {
            dataServerProcess.kill("SIGHUP");
        }
        dataServerProcess = spawn('node', [__dirname + "/dataserver/spawn.js"]);
    }

    updateAndRestart() {
        log('Gardener', 'Restarting instances...', 'Lilium');
        const pids = Object.keys(garden);
        this.caijProc.kill("SIGHUP")
        pids.forEach(pid => garden[pid].kill("SIGHUP"));
        
        this.spawnSharedMemory();
        this.spawnDataServer();
    }

    broadcast(m) {
        if (m == "updateAndRestart") {
            return this.updateAndRestart();
        }

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

};

global.__LILIUMNETWORK = new Gardener();
global.__LILIUMNETWORK.start();
