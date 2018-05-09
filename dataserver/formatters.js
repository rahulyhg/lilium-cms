module.exports.presentableFacebookUser = (u,picture,lmltk) => {
    return {
        _id : require('crypto').createHash('sha256').update(u.id).digest('hex'),
        displayname : u.name,
        gender : u.gender,
        createdAt : Date.now(),
        feedtype : "full",
        language : "all",

        picture,
        lmltk
    }
}

module.exports.makeToken = token => {
    return "lmldstk-" + require('crypto').createHash('sha256').update(token + Date.now()).digest("hex");
};

module.exports.readPostData = (cli, sendback) => {
    let dat = "";
    cli.request.on('data', c => {
        dat += c.toString();
    });

    cli.request.on('end', () => {
        sendback(dat);
    });
}

const ObjectID = require('mongodb').ObjectID;
module.exports.mongoID = _id => {
    try {
        return new ObjectID(_id);
    } catch(err) {
        return new ObjectID();
    }
};