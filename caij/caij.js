const net = require('net');

const log = require('../log.js');
const fileserver = require('../fileserver.js');

const taskscheduler = require('./taskscheduler.js');
const AI = require('./ai.js');

class ConsoleArtificialIntelligenceJanitor {
    constructor() {

    }

    // Client CAIJ
    getConnection() {
        return net.connect({path : __dirname + "/caij.sock"});
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
        taskscheduler.push(msgObject);
    }

    incoming(connection) {
        log('CAIJ', "Incoming connection", 'detail');

        let that = this;
        let data = "";
        connection.on('data', (c) => {
            data += c.toString();
        });

        connection.on('end', () => {
            that.handleMessage.apply(this, [JSON.parse(data)]);
        });
    }

    createServer() {
        fileserver.deleteFile(__dirname + "/caij.sock", () => {
            this.server = net.createServer(this.incoming.bind(this));
            this.server.on('error', this.error);
            this.server.listen({
                path : __dirname + "/caij.sock"
            }, () => {
                log('CAIJ', "Socket file open", 'live');
            });

            AI.bringToLife();
        });
    }
}

module.exports = new ConsoleArtificialIntelligenceJanitor();
