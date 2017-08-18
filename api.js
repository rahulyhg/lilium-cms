class EndpointMethods {
    constructor() {
        this.GET    = {};
        this.POST   = {};
        this.PUT    = {};
        this.DELETE = {};
    }

    addMethod(kind) {
        this[kind] = this[kind] || {};
    }
}

const log = require('./log.js');
const db = require('./includes/db.js');
const article = require('./article.js');
const endpoints = require('./endpoints.js');
const sharedcache = require('./sharedcache.js');
const entities = require('./entities.js');

const ApiEndpoints = new EndpointMethods();
const SESSION_COLLECTION = "apisessions";

const s4 = () => Math.random().toString(16).substring(2);

class LiliumAPI {
	serveApi(cli) {
		cli.touch('api.serveApi');
		api.handleApiEndpoint(cli);
	};	

    registerMethod(methodname) {
        ApiEndpoints.addMethod(methodname);
    }

	handleApiEndpoint(cli) {
		cli.touch('api.handleAdminEndpoint');
        cli.cors = true;

        if (!cli.routeinfo.path[1]) {
		    cli.throwHTTP(404, undefined, true);
        } else if (api.apiEndpointRegistered(cli._c.id + cli.routeinfo.path[1], cli.method)) {
		    ApiEndpoints[cli.method][cli._c.id + cli.routeinfo.path[1]](cli);
        } else if (api.apiEndpointRegistered(cli.routeinfo.path[1], cli.method)) {
		    ApiEndpoints[cli.method][cli.routeinfo.path[1]](cli);
		} else {
		    cli.throwHTTP(404, undefined, true);
		}
	};

	apiEndpointRegistered(endpoint, method) {
		return (typeof ApiEndpoints[method][endpoint] !== 'undefined');
	};

	registerApiEndpoint(endpoint, method, func) {
        log('API', 'Registering API endpoint ' + method + "@" + endpoint);
	    ApiEndpoints[method][endpoint] = func;
	};

    pushInCache(key, value, done) {
        sharedcache.set({
            ["api_" + key] : value
        }, done || function() {});
    };

    fetchFromCache(key, done) {
        sharedcache.get("api_" + key, value => {
            done(value);   
        });
    };

    generateToken(prefix = "") {
        return prefix+s4()+s4()+s4()+s4()+s4()+s4()+s4()+s4();
    }

    getSession(token, done) {
        this.fetchFromCache("session_" + token, (maybeSession) => {
            done(maybeSession);
        });
    }

    loadSessionsInCache(done) {
        db.join(require('./config.js').default(), SESSION_COLLECTION, [
            {
                $lookup : {
                    from : "entities",
                    localField : "userid",
                    foreignField : "_id",
                    as : "user"
                }
            }
        ], (arr) => {
            if (!arr || !arr.filter) {
                return done();
            }

            log('API', `Loading ${arr.length} sessions in cache`);
            arr.filter(x => x.user[0] && !x.user[0].revoked).forEach(a => {
                const session = entities.toPresentable(a.user[0]);
                session.since = a.since;
                entities.rightsFromRoles(a.user[0].roles, (rights) => {
                    session.rights = rights;
                    this.pushInCache("session_" + a.token, session);
                });

                session.userid = a._id;
            });

            done && done();
        });
    }

    createSession(user, done) {
        let token = this.generateToken('lmlapi') + "_" + Date.now();
        entities.rightsFromRoles(user.roles, (rights) => {
            const session = entities.toPresentable(user);
            session.since = Date.now();
            session.rights = rights;

            this.pushInCache("session_" + token, session, () => { 
                db.insert(require('./config.js').default(), SESSION_COLLECTION, { 
                    token, userid : user._id, 
                    since : Date.now() 
                }, () => {
                    done(token);
                });
            });
        });
    }
}

const api = new LiliumAPI();
module.exports = api;
