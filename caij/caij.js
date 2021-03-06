const net = require('net');

const filelogic = require('../pipeline/filelogic');

const taskscheduler = require('./taskscheduler.js');
const AI = require('./ai.js');

const CAIJport = require('../sites/default').caijport;

class ConsoleArtificialIntelligenceJanitor {
    constructor() {

    }

    // Client CAIJ
    getConnection() {
        return net.connect(CAIJport ? {
            host : "localhost", port : CAIJport
        } : {path : __dirname + "/caij.sock"});
    }

    scheduleTask(taskname, extra) {
        let conn = this.getConnection();
        conn.write(JSON.stringify({
            taskname : taskname, 
            extra : extra || {}
        }));

        conn.end();
    }

    // Server CAIJ
    error(err) {
        log('CAIJ', "Error from socket => " + err, 'err');
    }

    handleMessage(msgObject) {
        log('CAIJ', "Handling message with task type " + msgObject.taskname);
        if (msgObject.direct) {
            taskscheduler.prepend(msgObject);
            AI.decide(true, () => {
                log('CAIJ', "Finished handling direct instruction");
            });
        } else if (msgObject.extra && msgObject.extra.module) {
            AI.moduleTask(msgObject);
        } else {
            taskscheduler.push(msgObject);
        }
    }

    incoming(connection) {
        log('CAIJ', "Incoming connection", 'detail');

        let data = "";
        connection.on('data', (c) => { data += c.toString(); });
        connection.on('end', () => { this.handleMessage(JSON.parse(data)); });
    }

    createServer() {
        filelogic.deleteFile(__dirname + "/caij.sock", () => {
            this.server = net.createServer(this.incoming.bind(this));
            this.server.on('error', this.error);
            this.server.listen(CAIJport ? {port : CAIJport, exclusive : true, host: "localhost"} : {
                path : __dirname + "/caij.sock"
            }, () => {
                log('CAIJ', "Socket file open", 'live');
            });

            AI.bringToLife();
        });
    }
}

module.exports = new ConsoleArtificialIntelligenceJanitor();
