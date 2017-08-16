const request = require('request');

class DarkskyPlugin {
    static get apidomain() {
        return "https://api.darksky.net/"
    }

    static get defaults() {
        return {
            language : "en",
            units : "auto"
        };
    }

    static formRequest(ftc, apikey, position, params) {
        return DarkskyPlugin.apidomain + ftc + "/" + this._c.darkskykey + "/" + position.join(',') + "?lang=" + params.en + "units=" + params.units
    }

    constructor() {
        this.libs = {};
        this.iface = {};
    }

    loadLibs() {
        const load = (libname, path) => {
            this.libs[libname] = require(this._c.server.base + (path || libname));
        };

        load('db', 'includes/db');
        load('riverflow', 'riverflow/riverflow');
        load('log');
        load('hooks');
        load('config');
    }

    reload() {
        this._c = this.libs.config.default();
    }   

    storeWeather(extra, done) {

    }

    appendSettings(form) {
        form.add('darkskytitle', 'title', { displayname : "Darksky API" });
        form.add('darkskykey', 'text', { displayname : "Darksky API key" });
    }

    loadHooks() {
        this.libs.hooks.bind('settings_form_bottom', 500, (pkg) => {
            this.appendSettings(pkg.form);
        });

        this.libs.hooks.bind('settings_saved', 10000, (cli) => {
            this.reload();
        });
    }

    loadDefault() {
        if (!this._c.darkskykey) {
            this._c.darkskykey = "";
        }
    }

    addFlow() {
        this.libs.riverflow.registerFlow({
            module : "plugins/darksky/darksky",
            endpoint : "narcityweather",
            support : ["apiGET", "adminGET", "adminPOST"],
            caij : {
                "storeWeather" : { taskname : "storeWeather", call : "storeWeather", every : 1000 * 60 * 60 }
            }
        });
    }

    unregister(done) {
        delete this._c.darkskykey;
        done();
    }

    register(_c, info, done) {
        this._c = _c.default();
        this.loadLibs();

        this.loadHooks();
        this.loadDefault();
        this.addFlow();

        done();
    }
}

module.exports = new DarkskyPlugin();
