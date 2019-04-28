const Controller = require('../base/controller');
const db = require('../lib/db.js');
const mongo = require('mongodb');
const livevars = require('../pipeline/livevars');

const mlib = require('../lib/media');

class MediaController extends Controller {
    adminPOST(cli) {
        cli.touch('article.handlePOST');
        switch (cli.routeinfo.path[2]) {
        case 'upload':
            if (cli.hasRightOrRefuse("upload")) {
                mlib.upload(cli);
            }
            break;
        case 'updatecredit':
            if (cli.hasRightOrRefuse("upload")) {
                mlib.updatecredit(cli);
            }
            break;
        case 'delete':
            if (cli.hasRightOrRefuse("delete-upload")) {
                mlib.delete(cli);
            }
            break;
        case 'wptr':
            mlib.transferFromWordpress(cli);
            break;
        default:
            cli.throwHTTP(501, undefined, true);            
        }
    }

    adminGET(cli) {
        cli.touch('article.handleGET');

        if (cli.hasRightOrRefuse("list-uploads")) {
            switch (cli.routeinfo.path[2]) {
            case 'upload':
                mlib.upload(cli);
                break;
            case 'view':
                mlib.view(cli);
                break;
            case 'getMedia':
                mlib.getMedia(cli);
                break;
            case 'list':
                mlib.list(cli);
                break;
            default:
                return cli.throwHTTP(404, 'Not Found');
                break;
            }
        }
    }

    setup() {
        livevars.registerLiveVariable('media', function (cli, levels, params, callback) {
            var wholeDico = levels.length === 0;
            if (wholeDico) {
                db.singleLevelFind(cli._c, 'uploads', callback);
            } else if (levels[0] == 'getUrlFromId') {
                db.findToArray(cli._c, 'uploads', {_id : db.mongoID(params.id)}, function(err, arr){
                    if (arr.length > 0) {
                        callback({url: arr[0].url});
                    } else {
                        callback([]);
                    }
                });
            } else {
                db.multiLevelFind(cli._c, 'uploads', levels, {
                    _id: new mongo.ObjectID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["list-uploads"]);

        livevars.registerLiveVariable('uploads', function (cli, levels, params, callback) {
            var allMedia = levels.length === 0;

            if (allMedia) {
                var limit = params.limit || 50;
                var skip = params.skip || 0;

                db.aggregate(cli._c, 'uploads', [
                    {$sort : {_id : -1}}, {$skip : skip}, {$limit: limit}
                ], function(data) {
                    callback(data);
                });
            } else if (levels[0] == "single") {
                db.find(cli._c, 'uploads', {_id : db.mongoID(levels[1])}, [], function(err, cur) {
                    cur.hasNext(function(err, nxt) {
                        if (nxt) {
                            cur.next(function(err, img) {
                                callback(img);
                            });
                        } else {
                            callback({notfound: true});
                        }
                    });
                });
            } else {
                db.multiLevelFind(cli._c, 'uploads', levels, {
                    _id: new mongo.ObjectID(levels[0])
                }, {
                    limit: [1]
                }, callback);
            }
        }, ["list-uploads"]);
    }
}

module.exports = new MediaController();
