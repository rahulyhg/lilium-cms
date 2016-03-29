var registeredEndpoints = {
    GET: {},
    POST: {}
};

var EndPoints = function () {
    this.register = function (endpoint, method, callback) {
        if (typeof registeredEndpoints[method][endpoint] !== 'undefined') {
            throw new Error("[EndPointException - Already registered : " + method + "/" + endpoint + "]");
        }

        registeredEndpoints[method][endpoint] = callback;
    };

    this.unregister = function (endpoint, method) {
        if (typeof registeredEndpoints[method][endpoint] !== 'undefined') {
            delete registeredEndpoints[method][endpoint];
        }
    };

    this.isRegistered = function (endpoint, method) {
        return typeof registeredEndpoints[method][endpoint] !== 'undefined';
    };

    this.execute = function (endpoint, method, cli) {
        if (typeof registeredEndpoints[method][endpoint] !== 'undefined') {
            registeredEndpoints[method][endpoint](cli);
        } else {
            throw new Error("[EndPointException - Not Found : " + method + "/" + endpoint + "]");
        }
    };
};

module.exports = new EndPoints();