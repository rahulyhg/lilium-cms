// Does not accept query parameter
class ClientObject {
    constructor(_c, req, resp) {
        this._c = _c;
        this.request = req;
        this.response = resp;

        this.url = req.url.substring(1);
        this.url = this.url.endsWith('/') ? this.url.substring(0, this.url.length - 2) : this.url;

        this.path = this.url.split('/');
        this.endpoint = req.method + "/" + this.path[0];
    }

    sendJSON(object) {
        this.response.writeHead(200, { "Content-Type" : "application/json" });
        this.response.end(JSON.stringify(object));
    }

    throwHTTP(code) {
        this.response.writeHead(code);
        this.response.end();
    }

    static debug(cli) {
        cli.sendJSON({
            url : cli.url,
            path : cli.path,
            method : cli.method,
            endpoint : cli.endpoint
        });
    }
}

module.exports = ClientObject;