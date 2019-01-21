const MESSAGES = require('./messages');
const fs = require('fs');
const pathlib = require('path');

const VALID_COMMANDS = {};
class ShellCommand {
    constructor(txt, session) {
        this.txt = txt.toString();
        this.session = session;

        const split = this.txt.split(' ');
        this.command = split[0].toLowerCase();
        this.args = split.splice(1);
    }

    static loadCommands() {
        fs.readdirSync(pathlib.join(liliumroot, 'cli', 'cmds')).filter(x => x.endsWith('.js')).forEach(file => {
            const ftc = require(pathlib.join(liliumroot, 'cli', 'cmds', file));
            VALID_COMMANDS[file.replace('.js', '')] = ftc;
        });
    }

    get isValid() {
        return !!VALID_COMMANDS[this.command];
    }

    execute() {
        VALID_COMMANDS[this.command](this.session, ...this.args);
    }

    reject() {
        this.session.throw(MESSAGES.NO_SUCH_COMMAND);
    }
}

module.exports = ShellCommand;
