const fs = require('fs');
const pathlib = require('path');
const net = require('net');

const ShellCommand = require('./command');
const ShellSession = require('./session');

class ShellServer {
    constructor() {
        this.sessions = [];
        this.server = net.createServer(this.onConnect.bind(this));
    }

    onConnect(conn) {
        const session = new ShellSession(conn);
        log('Shell', 'Opening shell connection with id ' + session.id, 'info');
        this.sessions.push(session);

        conn.on('close', () => {
            log('Shell', 'Shell connection with id ' + session.id + ' was terminated', 'info');
            this.sessions.splice(this.sessions.indexOf(session), 1);
        });

        conn.on('data', cmd => {
            const command = new ShellCommand(cmd, session);
            command.isValid ? command.execute() : command.reject();
        });
    }

    start() {
        log('Shell', 'Initializing interactive shell', 'info');

        try {
            fs.unlinkSync(pathlib.join(liliumroot, 'cli', 'shell.sock'));
        } catch (err) {}
        
        ShellCommand.loadCommands();
        this.server.listen({
            path : pathlib.join(liliumroot, 'cli', 'shell.sock')
        }, () => {
            log('Shell', 'Listening to connections', 'success');
        });

        process.on('exit', () => {
            this.server && this.server.end();
        });
    }
}

module.exports = ShellServer;
