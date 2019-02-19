const configlib = require(liliumroot + '/lib/config');
const MESSAGES = require('../messages');

module.exports = function(session, sitename) {
    if (!sitename) {
        return session.throw(MESSAGES.INVALID_ARGS);
    }

    let usedSite;
    configlib.eachSync(site => {
        if (
            site.website.sitetitle.includes(sitename) || 
            site.server.url.includes(sitename) 
        ) {
            usedSite = site;
        }
    });

    if (usedSite) {
        session.setConfig(usedSite);
        session.sendData("Switched to website " + usedSite.website.sitetitle);
    } else {
        session.throw(MESSAGES.CONTENT_NOT_FOUND);
    }
}
