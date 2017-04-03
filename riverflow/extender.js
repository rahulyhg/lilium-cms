class RiverflowExtender {
    constructor() {
        this.module = "riverflow/extender.js";
        this.endpoint = "none";
        this.origin = "none;"
        this.support = [];
    }

    adminGET(cli)  { cli.throwHTTP(501);  };
    adminPOST(cli) { cli.throwHTTP(501); };

    GET(cli)  { cli.throwHTTP(501); };
    POST(cli) { cli.throwHTTP(501); };

    livevar(cli, levels, params, send) { send({error : "Not implemented", code : 501}) };
    form() { };
    setup() { };
}

module.exports = RiverflowExtender;
