const fs = require('fs');

const padding = "          ";
let padLine = linenum => {
    return linenum + padding.substring(linenum.toString().length);
}

class StackTrace {
    constructor (title) {
        this.title = title;
        this.blocks = [];
    }

    toString() {
        return this.title + "\n" + this.blocks.map(x => x.file + ", line " + x.line + ": " + x.title + "\n" + x.code.join('\n')).join('\n\n');
    }

    toMarkDown() {
        
    }

    appendFromFile(stackline, done) {
        let blocktitle = stackline.trim().substring(3);

        const block = {
            title : blocktitle.substring(0, blocktitle.indexOf('(') - 1),
            code : [],
            file : stackline.substring(stackline.indexOf('(') + 1, stackline.indexOf(':')),
            line : stackline.substring(stackline.indexOf(':') + 1, stackline.lastIndexOf(':'))
        };

        fs.readFile(block.file, 'utf8', (err, text) => {
            if (err) {
                block.code.push("Cannot read the content of a file with a relative path or of a native library.");
            } else {
                const lines = text.split("\n")
                let min = block.line - 8;
                let max = min + 17;

                if (min < 0) { min = 0; }
                if (max >= lines.length) { max = lines.length - 1; }

                let line = min - 1;
                block.code = lines.slice(min, max).map(x => padLine(++min) + x);
            }

            this.blocks.push(block);

            done();
        });
    }

    static makeFromSyntaxError(err, sendback) {
        const st = new StackTrace("SyntaxError");

        const levels = err.stack.split('\n');
        const fileinfo = levels[0].split(':');
        const block = {
            title : levels[4],
            code : [],
            file : fileinfo[0],
            line : fileinfo[1]
        };

        fs.readFile(block.file, 'utf8', (err, text) => {
            if (err) {
                block.code.push("Cannot read the content of a file with a relative path or of a native library.");
            } else {
                const lines = text.split("\n")
                let min = block.line - 8;
                let max = min + 17;

                if (min < 0) { min = 0; }
                if (max >= lines.length) { max = lines.length - 1; }

                let line = min - 1;
                block.code = lines.slice(min, max).map(x => padLine(++min) + x);
            }

            st.blocks.push(block);
            sendback(st);
        });
    }

    static makeFromError(err, sendback) {
        const levels = err.stack.split('\n');
        const st = new StackTrace(levels[0]);

        let index = 0;
        let next = () => {
            if (++index == levels.length) {
                return sendback(st);
            }

            st.appendFromFile(levels[index], next);
        };

        next();
    }
}

class StackTracer {
    static traceStack(err, done) {
        if (err.stack.includes('SyntaxError')) {
            StackTrace.makeFromSyntaxError(err, st => done && done(st));
        } else {
            StackTrace.makeFromError(err, st => done && done(st));
        }
    }
}

module.exports = StackTracer;
