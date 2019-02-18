

class Rewriter {
    rewrite(cli) {
        if (cli.routeinfo.path.length > 1 && cli.routeinfo.path[cli.routeinfo.path.length - 1] == "feed" && !cli.routeinfo.admin) {
            var newpath = cli.routeinfo.path.slice(0, -1);
            cli.redirect(cli._c.server.protocol + cli._c.server.url + "/feed/" + newpath.join('/'), true);
            return true;
        }

        return false;
    }
}

module.exports = new Rewriter();
