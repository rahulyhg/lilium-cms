const db = require('./includes/db');

const LIVEVAR_COMMENT_BATCHSIZE = 50;

class LiliumComments {
    adminPOST(cli) {

    }

    livevar(cli, levels, params, sendback) {
        if (!cli.hasRight("editor")) {
            return sendback([]);
        }

        const filters = params.filters || {};
        const $skip = filters.skip || 0;
        const $sort = { _id : -1 };
        const $match = {
            active : true
        };

        if (levels[0] == "latest") {
            db.aggregate(cli._c, 'comments', [
                { $match },
                { $sort },
                { $skip },
                { $limit : LIVEVAR_COMMENT_BATCHSIZE }
            ], arr => {
                sendback(arr);
            })
        } else {
            sendback("[LiveVariableException] Cannot use top level livevar");
        }
    }

    GET(cli) {
        
    }

    POST(cli) {

    }
}

module.exports = new LiliumComments();