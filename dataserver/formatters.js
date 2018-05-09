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