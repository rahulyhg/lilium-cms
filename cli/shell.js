const readline = require('readline-sync');
const net = require('net');

const MESSAGES = require('./messages');

function connectToLilium() {
    let connection;
    console.log('Connecting...');

    try {
        connection = net.connect('./shell.sock');
        connection.on('error', err => {
            console.log('Connection lost');
            process.exit(1);
        });
    } catch (err) {
        console.log('Could not establish connection via shell');
        process.exit(1);
    }

    return connection;
}

function waitForInput() {
    const cmd = readline.question('> ').trim();
    if (cmd == "exit") {
        connection.end();
        connection.destroy();
        process.exit(0);
    } else if (cmd) {
        connection.write(cmd);
    } else {
        setImmediate(waitForInput);
    }
}

function waitForOutput() {
    connection.on('data', data => {
        try {
            data = data.toString();
            const resp = JSON.parse(data);

            switch (resp.code) {
                case MESSAGES.OK:
                    console.log("Command executed successfully");
                    break;

                case MESSAGES.DATA:
                    console.log("Command executed successfully with data");
                    console.log(resp.data);
                    break;

                case MESSAGES.NO_SUCH_COMMAND:      console.log("Command not found"); break;
                case MESSAGES.INVALID_ARGS:         console.log("Command failed due to invalid args"); break;
                case MESSAGES.CONTENT_NOT_FOUND:    console.log("Command failed due to missing entity / content"); break;
                case MESSAGES.INVALID_CONTEXT:      console.log("The provided context is invalid"); break;
                case MESSAGES.HELLO:                console.log("Connection established"); break;
            }
        } catch (err) {
            console.log('Invalid response from Lilium');
            console.log(err);
            console.log(data);
        }

        console.log("");
        setImmediate(waitForInput);
    });
}

console.log('Lilium CMS - Interactive Shell');
const connection = connectToLilium();
if (connection) {
    waitForOutput();
    connection.write('hello');
}
