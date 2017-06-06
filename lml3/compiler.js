const log = require('../log.js');

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
        this.petalobject = require(context.workdir + petalname + LMLConst.petalext); 
        this.context = context;
        this.petalname = petalname;
    }

    compile() {
        this.petalobject.compile(this.context.o, this.context);
    }
}

class LMLContext {
    constructor(_c, original = {}, settings = {}) {
        for (var k in settings) { this[k] = settings[k]; }
        for (var k in original) { this[k] = original[k]; }

        this._c = _c;
        this.extra = original;
        this.blocks = {};

        this.generateLivevars().createOutputFunction().readPetals().loadLibraries();
    }

    loadLibraries() {
        this.libs = {
            formbuilder : require('../formBuilder.js'),
            encodec : require('entities'),
            slugify : require('slugify'),
            fileio : require('../fileserver.js'),
            postlead : require('../postleaf.js').getLeaves()
        };
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
            contents[petals[i]] = new LMLPetal(this, petals[i]);
        });

        this.petals = contents;
        return this;
    }

    generateLivevars() {
        let str = "";
        this.livevars && this.livevars.forEach(l => {
            let params = l.params ? JSON.stringify(l.params).replace(/\"/g, "&lmlquote;") : "{}";
            str += `<lml:livevars data-varname="${l.name}" data-varparam="${params}"></lml:livevars>`;
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

    compile(_c, abspath, extra, done) {
        log('LML3', "Loading LML3 file : " + abspath, 'info');
        let now = new Date();
        let lml3file = require(abspath);
        let settings = lml3file.settings || {};
        settings.workdir = abspath.substring(0, abspath.lastIndexOf("/"));
        settings.currentfile = abspath;

        let context = new LMLContext(_c, extra, settings);
        this.preload(lml3file.preload, context, () => {
            lml3file.compile(context.o, context);
            log('LML3', 'Compiled file in ' + (new Date() - now) + "ms", 'detail');
            done(context.markupbuffer.getMarkup());
        });
    }
}

module.exports = new LML3();
