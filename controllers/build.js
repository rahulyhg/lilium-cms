const builder = require('../make/build');

class BuildController {
    adminPOST(cli) {
        if (cli.hasRightOrRefuse('lilium')) {
            if (cli.routeinfo.path[2] == "lilium") {
                const b = init_build_tree.find(x => x.input == "lilium" && x._c.id == cli._c.id);
                if (b) {
                   builder.build(b._c, b.input, b.outputkey, Object.assign({}, b.options, {dontOverwite : false}), () => {
                        cli.sendJSON({done : 1})
                   })
                } else {
                    cli.sendJSON({ error : "nobuildinfo" });
                }
            }
        }
    }
}

module.exports = new BuildController();
