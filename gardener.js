const config = require('./config.js');
const filelogic = require('./pipeline/filelogic');
const cluster = require('cluster');
const RedisServer = require('redis-server');
const log = require('./log');
const fs = require('fs');

const { spawn, execSync } = require('child_process');

const garden = {};

const REDIS_SERVER_LOCAL_PORT = 6379;

let sharedMemoryProcess;
let dataServerProcess;
let redisserver;
let bootCount = 0;
let shuttingdown;

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

    onExit(code = 0) {
        shuttingdown = true;
        log();
        log("Network", "----------------------------------------------", "lilium");
        log('Network', 'Killing CAIJ process', 'lilium');
        if (this.caijProc) {
            try {
                process.kill(this.caijProc.process.pid, "SIGKILL");
                log('Network', 'Killed CAIJ process', 'lilium');
            } catch (err) {
                log('Network', 'Did not kill CAIJ process', 'info');
            }
        }

        const pids = Object.keys(garden);
        log('Network', 'Killing Lilium processes with PIDs : ' + pids.join(', '), 'lilium');
        pids.forEach(pid => {
            try {
                log('Network', 'Terminating process ' + pid, 'lilium');
                process.kill(pid, "SIGKILL")
            } catch (err) {
                log('Network', 'Did not terminate process ' + pid, 'info');
            }
        });

        log('Network', 'Killing data server process', 'lilium');
        if (dataServerProcess) {
            try {
                process.kill(dataServerProcess.process.pid, "SIGKILL"); 
                log('Network', 'Killed data server', 'lilium');
            } catch (err) {
                log('Network', 'Did not kill data server process : ' + err, 'info');
            }
        }

        log('Network', 'Killing shared memory process', 'lilium');
        if (sharedMemoryProcess) { 
            try {
                process.kill(sharedMemoryProcess.process.pid, "SIGKILL"); 
                log('Network', 'Killed shared memory server', 'lilium');
            } catch (err) {
                log('Network', 'Did not kill shared memory process : ' + err, 'info');
            }
        }

        log('Network', 'Gracefully terminated Lilium process', 'success');

        log('Network', "Sending exit code " + code, 'lilium');
        log("Network", "----------------------------------------------", "lilium");
        log();

        process.exitCode = code;
        process.exit(code);
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
            log.setName("GRDNR");
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
                this.caijProc = cluster.fork({parent : "gardener", job : "caij", handleError : "crash", logname : "JNTOR"})
                this.caijProc.on('message', this.broadcast.bind(this));

                log('Network', 'Starting ' + lmlinstances + ' processes', 'lilium');
                for (let i = 0; i < lmlinstances; i++) {
                    const chld = cluster.fork({instancenum : i, parent : "gardener", logname : "CHLD" + i});
                    chld.instancenum = i;
                    garden[chld.process.pid] = chld;
                    chld.on('message', this.broadcast.bind(this));
                    bootCount++;
                }

                cluster.on('online', worker => {
                    log('Network', 'Worker ' + worker.process.pid + ' is online', 'success');
                });

                !global.__TEST && cluster.on('exit', (worker, code, signal) => {
                    if (!shuttingdown) {
                        if (worker == this.caijProc) {
                            this.caijProc = cluster.fork({parent : "gardener", job : "caij", handleError : "crash", logname : "JNTOR"})
                            return this.caijProc.on('message', this.broadcast.bind(this));
                        }

                        log('Network', 'Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal, 'err');
                        log('Network', 'Starting a new worker', 'info');

                        const pid = worker.process.pid;
                        const dyingChld = garden[pid];

                        if (dyingChld) {
                            const chld = cluster.fork({instancenum : dyingChld.instancenum, parent : "gardener", logname : "CHLD" + dyingChld.instancenum});
                            chld.instancenum = dyingChld.instancenum;
                            chld.on('message', this.broadcast.bind(this));

                            delete garden[pid];
                            garden[chld.process.pid] = chld;
                            bootCount++;
                            log('Network', 'Started a new worked with process ' + worker.process.pid, 'success');
                        } else {
                            log('Network', 'A worker died before instance it could be added to garden.', 'error');
                            log('Network', 'This is a fatal error', 'error');
                            this.onExit(1);
                        }
                    }
                }); 
            });
        } else {
            log.setName(process.env.logname || "CHLDP")
            log('Gardener', 'Set log name : ' + log.getName(), 'lilium');
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
        sharedMemoryProcess = cluster.fork({ spawn : __dirname + '/network/spawn.js', logname : "SHRDM" })

        !global.__TEST && sharedMemoryProcess.on('error', err => {
            log('Gardener', err, 'err');
        })
    }

    spawnDataServer() {
        log('Network', 'Spawning dataserver', 'lilium');
        if (dataServerProcess) {
            dataServerProcess.kill("SIGKILL");
        }
        dataServerProcess = cluster.fork({ spawn : __dirname + '/dataserver/spawn.js', logname : "DATAS" })
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

        if (m.ev == "testsFinished" && global.__TEST) {
            return this.onExit(m.code);
        }

        if (m.type == "output") {
            if (m.payload.clear) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
            }

            return process.stdout.write(`${log.levelColors[m.payload.level] || log.levelColors.none}[${m.payload.sender}] ${m.payload.message}`.substring(0, process.stdout.columns - 2) + log.levelColors.none);
        }

        if (m == "fatal" || m.type == "fatal") {
            log("Gardener", "[FATAL] Received fatal error message from child process", "err");
            log("Gardener", "[FATAL] About to send SIGKILLs to all children process", "err");

            if (m.payload) {
                console.log("");
                console.log("More details --- ");
                console.log("");
                console.log(m.payload.err.toString());
                console.log(m.payload.stack || "");
                console.log("");
            }

            return this.onExit(1);
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

if (process.env.spawn) {
    log.setName(process.env.logname || process.pid);
    log('Gardener', 'Environment variable spawn found, running in spawn mode', 'lilium');
    log('Gardener', 'Hello from ' + process.env.spawn, 'lilium');
    require(process.env.spawn);
} else {
    switch (global.psmanager) {
        case "pm2"     : global.__LILIUMNETWORK = new PM2Cluster(); break;
        case "cluster" : global.__LILIUMNETWORK = new GardenerCluster(); break;
        default : log("Gardener", "No process manager defined.", "err"); process.exit(1);
    }

    global.__LILIUMNETWORK.start();
}
