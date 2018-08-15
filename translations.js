const vocab = require('./vocab');

class Translations {

    livevar(cli, levels, params, sendback) {
        if (levels[0] == 'getSupportedLanguages') {
            sendback(vocab.getSUpportedLanguages());
        } else if (levels[0] == 'getSupportedLanguageCodes') {
            sendback(vocab.getSupportedLanguageCodes());
        } else if (levels[0] == 'getLanguageResource') {
            if (levels[1]) {
                sendback(vocab.getLangData(levels[1]));
            } else {
                cli.throwHTTP(400, 'No language was provided', true);
            }
        } else if (levels[0] == 'getAllLanguageResources') {7
            sendback(vocab.getAllLanguageResources());
        } else if (levels[0] == 'getPages') {
            sendback(vocab.getPages());
        }
    }

    adminPOST(cli) {
        cli.touch("translations.adminPOST");
        if (cli.routeinfo.path[2] == 'updateLanguageSlug') {
            vocab.updateSlug(cli.postdata.data.lang, cli.postdata.data.pageName, cli.postdata.data.slug, cli.postdata.data.newValue, err => {
                cli.sendJSON({ success: !err })
            });
        } else if (cli.routeinfo.path[2] == 'updateSlugName') {
            vocab.updateSlugName(cli.postdata.data.pageName, cli.postdata.data.slug, cli.postdata.data.newName, err => {
                cli.sendJSON({ success: !err })
            });
        } else if (cli.routeinfo.path[2] == 'removeField') {
            vocab.removeField(cli.postdata.data.pageName, cli.postdata.data.slug, err => {
                cli.sendJSON({ success: !err })
            });
        } else if (cli.routeinfo.path[2] == 'deleteSlug') {
            cli.sendJSON({ success: !err })
        } else {
            cli.throwHTTP(404, '', true);
        }
    }

}

module.exports = new Translations();
