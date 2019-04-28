module.exports = class Controller {
    livevar(cli, levels, params, send) {
        send({ error : "Not Implemented" });
    }

    adminPOST(cli) { cli.throwHTTP(501, "Not Implemented"); }
    adminPUT(cli) { cli.throwHTTP(501, "Not Implemented"); }
    adminDELETE(cli) { cli.throwHTTP(501, "Not Implemented"); }
    GET(cli) { cli.throwHTTP(501, "Not Implemented"); }
    POST(cli) { cli.throwHTTP(501, "Not Implemented"); }
    PUT(cli) { cli.throwHTTP(501, "Not Implemented"); }
    DELETE(cli) { cli.throwHTTP(501, "Not Implemented"); }
    apiGET(cli) { cli.throwHTTP(501, "Not Implemented"); }
    apiPOST(cli) { cli.throwHTTP(501, "Not Implemented"); }
    apiPUT(cli) { cli.throwHTTP(501, "Not Implemented"); }
    apiDELETE(cli) { cli.throwHTTP(501, "Not Implemented"); }
}
