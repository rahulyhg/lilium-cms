const metrics = require('../lib/metrics');

// Documentation : https://docs.google.com/document/d/1CNue3XC7tBQbr1BnBQaQUxkKCPF6qidOW7lgvZe3ets/edit?usp=sharing
const LMLConst = {
    lmlext : ".lml3",
    petalext : ".petal3"
}

class MarkupBuffer {
    constructor() {
        this.markup = "";
    }

    write(str) {
        this.markup += str;
    }

    getMarkup() {
        return this.markup;
    }
}

class LMLPetal {
    constructor(context, petalname) {
        const petalpath = context.workdir + "/" + petalname + LMLConst.petalext;
        if (context._c.env == "dev") {
            require.cache[petalpath] = undefined;
        }

        // log("Petal", "Requiring petal file " + petalname, 'info')
        this.petalobject = require(petalpath);
        this.context = context;
        this.petalname = petalname;
    }

    compile() {
        // log("Petal", "Compiling petal file " + this.petalname, 'info');
        const buffer = new MarkupBuffer();
        this.petalobject.compile((...str) => { str.forEach(x => buffer.write(x)) }, this.context, this.context.vocab);
        return "<!-- petalstart "+this.petalname+" -->" + buffer.getMarkup() + "<!-- petalend -->";
    }
}

class LMLTool {
    constructor(context, type, tool) {
        this.type = type;

        switch (type) {
            case "add":
                this.markup = `<a class="fab lml3-tool-add" ${tool.href&&'href="'+tool.href+'"'||''}>+</a>` +
                    (tool.call && (
                        `<script>
                            document.querySelector('.lml3-tool-add').addEventListener("click", function(ev) {
                                ev.which != 3 && ev.button != 2 && ${tool.call}();
                            });

                            document.querySelector('.lml3-tool-add').addEventListener("contextmenu", function(ev) {
                                ev.target.classList.toggle('up');
                                ev.preventDefault();
                                return false;
                            });
                        </script>`
                    )
                );
                break;

            default :
                this.markup = "[Undefined tool type]";
        }
    }

    toString() {
        return this.markup;
    }
}

class LMLContext {
    constructor(_c, original = {}, settings = {}) {
        for (var k in settings) { this[k] = settings[k]; }
        for (var k in original) { this[k] = original[k]; }

        this._c = _c;
        this.extra = original;
        this.blocks = {};

        this.generateLivevars()
            .createOutputFunction()
            .readPetals()
            .loadLibraries()
            .prepareHeader();
    }

    maybeCreateAddTool() {
        if (this.tools && this.tools.add) {
            return new LMLTool(this, "add", this.tools.add);
        }

        return "";
    }

    prepareHeader() {
        this.header = "";

        if (this.lmldom) {
            this.header += `<lml-dom v="${this.lmldom.v}" features="${this.lmldom.features?this.lmldom.features.join(','):''}">
            </lml-dom>`;
        }

        this.header += this.livevars || '';
        this.header += this.title ? `<h1>${this.title}</h1>` : ""; 
        this.header += this.maybeCreateAddTool();

        return this;
    }

    loadLibraries() {
        this.libs = {
            encodec : require('entities'),
            app : require('../build').getAppScript,
            cdn : require('../lib/cdn'),
            slugify : require('slugify'),
            fileio : require('../pipeline/filelogic.js'),
            encode : x => (x && x.replace ? x.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;") : x),
            snip : (snipid, ...args) => require('../themes').renderSnip(this._c, snipid, args)
        };

        return this;
    }

    createOutputFunction() {
        this.markupbuffer = new MarkupBuffer();
        this.o = (...str) => {
            str.forEach(s => this.markupbuffer.write(s));
        }
        return this;
    }

    readPetals() {
        let contents = {};
        let petals = this.petals || [];
        petals.forEach(p => {
            contents[p] = new LMLPetal(this, p);
        });

        this.petals = contents;
        return this;
    }

    generateLivevars() {
        let str = "";
        this.livevars && this.livevars.forEach(l => {
            if (typeof l == "string") {
                l = {name : l};
            }
            let params = l.params ? JSON.stringify(l.params).replace(/\"/g, "&lmlquote;") : "{}";
            str += `<lml-livevars data-varname="${l.name}" data-varparam="${params}"></lml-livevars>`;
        });

        this.livevars = str;
        return this;
    }
}

class LML3 {
    get settings() {
        return LMLConst;
    }

    preload(ftc, context, done) {
        ftc ? ftc(context, done) : done();
    }

    compile(_c, abspath, extra, done, ___notsafe) {
        if (_c.env == "dev" && !___notsafe) {
            require.cache[abspath] = undefined;

            log('LML3', 'Running in safe mode', 'info');
            try {
              this.compile(_c, abspath, extra, done, true);
            } catch (ex) {
              log('LML3', 'Error compiling file ' + abspath, 'err');
              log('LML3', ex.stack, 'err');
              done("<h2>Crashed.</h2>" + ex.stack.split('\n').join("<br />"));
            }

            return;
        }

        let now = new Date();
        let lml3file = require(abspath);
        let settings = lml3file.settings || {};
        settings.workdir = abspath.substring(0, abspath.lastIndexOf("/"));
        settings.currentfile = abspath;

        let context = new LMLContext(_c, extra, settings);
        this.preload(lml3file.preload, context, () => {
            lml3file.compile(context.o, context, context.extra.vocab);
            log('LML3', 'Compiled file in ' + (new Date() - now) + "ms", 'detail');
            metrics.plus('lml3compile');
            done(context.markupbuffer.getMarkup());
        });
    }
}

module.exports = new LML3();
