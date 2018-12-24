const config = require('./config.js');
const fileserver = require('./fileserver.js');
const cluster = require('cluster');
const RedisServer = require('redis-server');
const fs = require('fs');
const log = require('./log.js');
const { spawn, execSync } = require('child_process');

const garden = {};

const REDIS_SERVER_LOCAL_PORT = 6379;

let sharedMemoryProcess;
let dataServerProcess;
let redisserver;
let bootCount = 0;

class ProcessManager {
    start() { 
        log('Network', 'Binding process termination', 'lilium');
        process.on('SIGINT', this.onExit.bind(this));

	    try {
            this.networkConfig = require('./sites/default.json').network;
	    } catch (err) {
            return this.fireupInitialServer();
        }

        log('Network', 'Network configuration loaded', 'success');
        log('Network', 'Spawning redis server', 'lilium');
        redisserver = new RedisServer(REDIS_SERVER_LOCAL_PORT);
    }

    onExit() {
        log();
        log("Network", "----------------------------------------------", "lilium");
        log('Network', 'Killing CAIJ process', 'lilium');
        this.caijProc && (this.caijProc.kill("SIGKILL"), log('Network', 'Killed CAIJ process', 'lilium'));

        const pids = Object.keys(garden);
        log('Network', 'Killing Lilium processes with PIDs : ' + pids.join(', '), 'lilium');
        pids.forEach(pid => garden[pid].kill("SIGKILL"));

        log('Network', 'Killing data server process', 'lilium');
        dataServerProcess && (dataServerProcess.kill("SIGKILL"), log('Network', 'Killed data server', 'lilium'));

        log('Network', 'Killing shared memory process', 'lilium');
        sharedMemoryProcess && (sharedMemoryProcess.kill("SIGKILL"), log('Network', 'Killed shared memory server', 'lilium'));

        log('Network', 'Gracefully terminated Lilium process', 'success');
        process.exit();
    }

    fireupInitialServer() {
        log('Network', 'Firing up initial server', 'lilium');
        require("./includes/initialserver").init(this.followupInitServer.bind(this));
    }

    followupInitServer() {
        this.start();
    }
}

class GardenerCluster extends ProcessManager {
    start() {
        if (cluster.isMaster) {
            require('./masthead.js');
            log('Network', 'Loading network config', 'lilium');

            super.start();

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

                !global.__TEST && cluster.on('exit', (worker, code, signal) => {
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

    spawnSharedMemory() {
        log('Network', 'Spawning local cache server', 'lilium');
        if (sharedMemoryProcess) {
            sharedMemoryProcess.kill("SIGKILL");
        }
        sharedMemoryProcess = spawn("node", [__dirname + "/network/spawn.js"]);
        sharedMemoryProcess.on('error', err => {
            log('Gardener', err, 'err');
        })
    }

    spawnDataServer() {
        log('Network', 'Spawning dataserver', 'lilium');
        if (dataServerProcess) {
            dataServerProcess.kill("SIGKILL");
        }
        dataServerProcess = spawn('node', [__dirname + "/dataserver/spawn.js"]);
    }

    updateAndRestart() {
        log('Gardener', 'Restarting instances...', 'Lilium');
        const pids = Object.keys(garden);
        this.caijProc.kill("SIGKILL")
        pids.forEach(pid => garden[pid].kill("SIGKILL"));
        
        this.spawnSharedMemory();
        this.spawnDataServer();
    }

    broadcast(m) {
        if (m == "updateAndRestart") {
            return this.updateAndRestart();
        }

        if (m == "testsFinished" && global.__TEST) {
            return this.onExit();
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

class PM2Cluster extends ProcessManager {
    start() {
        if (process.env.pm2children) {
            log('PM2', 'Spawning cluster instance with pid ' + process.pid, 'lilium');
            const Lilium = require('./lilium.js');
            const lilium = new Lilium();
            garden[process.id] = lilium.cms();
        } else {
            super.start();

            redisserver.open(() => {
                pm2.connect(() => {
                    pm2.start({
                        name : "Sharedcache",
                        script : "network/spawn.js",
                        output : require('path').join(liliumroot, "log", "sharedcache.log"),
                        error : require('path').join(liliumroot, "log", "error.log"),
                        env : { pm2children : true,  pm2process : true, parent : "pm2"},
                        exec_mode : 'fork',
                        mergeLogs : true
                    }, (err, apps) => {
                        pm2.start({
                            name : "Dataserver API",
                            script : "dataserver/spawn.js",
                            output : require('path').join(liliumroot, "log", "dataserver.log"),
                            error : require('path').join(liliumroot, "log", "error.log"),
                            env : {"pm2children" : true, "pm2process" : true, parent : "pm2"},
                            exec_mode : 'fork',
                            mergeLogs : true
                        });

                        pm2.start({
                            name : "CAIJ",
                            script : "pm2.prod.js",
                            output : require('path').join(liliumroot, "log", "caij.log"),
                            error : require('path').join(liliumroot, "log", "error.log"),
                            env : {"pm2children" : true, "pm2process" : true, parent : "pm2", job : "caij", handleError : "crash"},
                            exec_mode : 'fork',
                            mergeLogs : true
                        });

                        pm2.start({
                            name : "Lilium elder process",
                            script : "pm2.prod.js",
                            output : require('path').join(liliumroot, "log", "elder.log"),
                            error : require('path').join(liliumroot, "log", "error.log"),
                            env : {"pm2children" : true, instancenum : 0, parent : "pm2"},
                            mergeLogs : true,
                            exec_mode : 'cluster',
                            instances : 1
                        }, (err, apps) => {
                            const processCount = (this.networkConfig.familysize || require('os').cpus().length) - 1;

                            if (processCount > 0) {
                                pm2.start({
                                    name : "Lilium child process",
                                    script : "pm2.prod.js",
                                    output : require('path').join(liliumroot, "log", "child.log"),
                                    error : require('path').join(liliumroot, "log", "error.log"),
                                    env : {"pm2children" : true, instancenum : 2, parent : "pm2"},
                                    mergeLogs : true,
                                    exec_mode : 'cluster',
                                    instances : processCount, 
                                }, () => {
                                    log('PM2', 'Disconnecting from PM2 deamon', 'lilium');
                                    pm2.disconnect();
                                });
                            } else {
                                log('PM2', 'Disconnecting from PM2 deamon', 'lilium');
                                pm2.disconnect();
                            }
                        });
                    });

                });
            });
        }
    }
}

switch (global.psmanager) {
    case "pm2"     : global.__LILIUMNETWORK = new PM2Cluster(); break;
    case "cluster" : global.__LILIUMNETWORK = new GardenerCluster(); break;
    default : log("Gardener", "No process manager defined.", "err"); process.exit(1);
}

global.__LILIUMNETWORK.start();
