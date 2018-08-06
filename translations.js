const vocab = require('./vocab');

class Translations {

    livevar(cli, levels, params, sendback) {
        console.log(levels);
        if (levels[0] == 'getSupportedLanguages') {
            console.log(vocab.getSUpportedLanguages());
            sendback(vocab.getSUpportedLanguages());
        } else if (levels[0] == 'getLanguageResource') {
            if (levels[1]) {
                console.log(vocab.getLangData(levels[1].replace('-', '')));
                sendback(vocab.getLangData(levels[1].replace('-', '')));
            } else {
                cli.throwHTTP(400, 'No language was provided', true);
            }
        } else if (levels[0] == 'getAllLanguageResources') {7
            console.log(vocab.getAllLanguageResources());
            sendback(vocab.getAllLanguageResources());
        } else if (levels[0] == 'getPages') {
            sendback(vocab.getPages());
        }
    }

    adminPOST(cli) {
        cli.touch("translations.adminPOST");
        if (cli.routeinfo.path[2] == 'updateLanguageSlug') {
            vocab.updateSlug(cli.postdata.data.lang, cli.postdata.data.pageName, cli.postdata.data.slug, cli.postdata.data.value, err => {
                if (!err)
                    cli.throwHTTP(200, '', true);
                else
                    cli.throwHTTP(500, 'Error writing language file', true);
            });
        } else if (cli.routeinfo.path[2] == 'createSlug') {
            cli.throwHTTP(200, '', true);
        } else if (cli.routeinfo.path[2] == 'deleteSlug') {
            cli.throwHTTP(200, '', true);
        } else {
            cli.throwHTTP(404, '', true);
        }
    }

}

module.exports = new Translations();
