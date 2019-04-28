const fs = require('fs');
const _configs = {};

class Config  {
    constructor() {
        this.httpRegex = /https?\:\/\//;
        this.lmlUserAgent = "Lilium/1.3 Linux Node/" + process.versions.node + " v8/" + process.versions.v8;
    }

    getAllSites() {
        const arr = [];
        for (var key in _configs) if (key != 'default') arr.push(_configs[key]);
        return arr;
    }

    getSimpleSites() {
        const arr = [];

        for (let key in _configs)
            if (key != 'default') {
                arr.push({
                    displayName: _configs[key].website.sitetitle,
                    name: key,
                    id : _configs[key].id,
                    network : _configs[key].default || false
                });
            }

        return arr;
    }

    getSimpleSitesAssoc() {
        const obj = {};

        for (let key in _configs)
            if (key != 'default') {
                obj[_configs[key].id] = ({
                    displayName: _configs[key].website.sitetitle,
                    name: key,
                    url : _configs[key].server.url,
                    network : _configs[key].default || false
                });
            }

        return obj;
    }

    fetchConfig(site) {
        let s = _configs[site];
        if (!s) {
            for (let cc in _configs) {
                if (_configs[cc].uid == site || _configs[cc].id == site) {
                    s = _configs[cc];
                    break;
                }
            }
        }
        return s;
    }

    fetchConfigFromCli(cli) {
        const rootdomain = cli.request.headers.host;

        cli.routeinfo.configname = rootdomain;
        cli.routeinfo.rootdomain = rootdomain;
        cli._c = _configs[rootdomain];
    }

    tryDefault() {
        try {
            return this.default();
        } catch(ex) { }

        return;
    }

    default() {
        return require('../sites/default.json');
    }

    eachSync(callback) {
        for (let site in _configs) {
            if (site != 'default') callback(_configs[site]);
        }
    }

    each(loopFtc, end) {
        const sites = Object.keys(_configs);
        let siteIndex = 0;

        const nextItem = () => {
            if (siteIndex == sites.length) {
                end && end();
            } else if (sites[siteIndex] == 'default') {
                siteIndex++;
                nextItem();
            } else {
                loopFtc(_configs[sites[siteIndex]], () => {
                    siteIndex++;
                    nextItem();
                });
            }
        };
        nextItem();
    }

    saveConfigs(config, callback) {
        fs.writeFile(config.server.base + "/sites/" + config.jsonfile, JSON.stringify(config, null, 4), { encoding : 'utf8' }, () => callback && callback());
    }

    registerConfigs(key, object) {
        _configs[key] = object;

        log('Config', 'Registered config with key ' + key);
        if (key == "default") {
            object.default = true;
        }
    }
};

module.exports = new Config();
