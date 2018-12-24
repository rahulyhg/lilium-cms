const fs = require('fs');
const pathlib = require('path');
const sharedcache = require('./sharedcache');
const JWSlib = require('jws');
const request = require('request');

const applicationID = "15976";
const installationID = "282785";

class GitHub {
    initialize() {
        const path = pathlib.join(liliumroot, '..', 'keys', 'github.pem');
        log('GitHub', 'Loading GitHub private key in memory', 'info');
        fs.stat(path, err => {
            if (!err) {
                log('GitHub', 'Successfully opened GitHub private key file', 'success');
                fs.readFile(path, (err, buffer) => {
                    sharedcache.set({
                        githubpem : buffer.toString()
                    });

                    this.makeTestRequest();
                    log('GitHub', 'Private key was sent to shared memory server', 'success');
                });
            } else {
                log('GitHub', 'Could not load GitHub private key from keys directory', 'warn');
            }
        })
    }

    makeTestRequest() {
        log('GitHub', 'Sending test request to issues endpoint', 'info');
        this.requestTo("/repos/narcitymedia/lilium-cms/issues", 'GET', (err, resp) => {
            if (err) {
                log('GitHub', 'Could not get a response from the API : ' + err, 'error');
            } else {
                log('GitHub', 'Got a valid response from the GitHub API with an array of ' + resp.length + ' open issues', 'success');
            }
        });
    }

    requestTo(endpoint, method = "GET", sendback) {
        const now = Date.now();
        this.getInstallationToken(token => {
            log('GitHub', 'Requesting to GitHub API at endpoint : ' + endpoint, 'info');
            request({
                url : "https://api.github.com" + endpoint,
                headers : {
                    Accept : "application/vnd.github.machine-man-preview+json",
                    Authorization : "token " + token,
                    "User-Agent" : "Lilium CMS v4 Linux"
                }, 
                method
            }, (err, r, body) => {
                if (err) {
                    sendback(err);
                } else {
                    try {
                        body = JSON.parse(body);
                    } catch (err) {
                        return sendback(err);
                    }

                    log('GitHub', 'Successfully requested to GitHub API ['+(Date.now() - now)+'ms]', 'success');
                    sendback(undefined, body);
                }
            });
        });
    }

    getInstallationToken(sendback) {
        log('GitHub', 'About to request installation key', 'info');
        this.getSignature(jwt => {
            if (jwt) {
                request({
                    url : "https://api.github.com/installations/" + installationID + "/access_tokens",
                    headers : {
                        Accept : "application/vnd.github.machine-man-preview+json",
                        Authorization : "Bearer " + jwt,
                        "User-Agent" : "Lilium CMS v4 Linux"
                    },
                    method : "POST"
                }, (err, r, body) => {
                    if (err) {
                        log('GitHub', 'API responded with an error', 'error');
                        return sendback(false);
                    }

                    if (typeof body == "string") {
                        try {
                            body = JSON.parse(body);
                        } catch (err) {
                            log('GitHub', 'Failed to parse JSON received from installation token request', 'error');
                            return sendback(false);
                        }

                        sendback(body.token);
                    }
                });
            } else {
                log('GitHub', 'Could not get JWT from private key', 'error');
                sendback(false);
            }
        })
    }

    getSignature(sendback) {
        sharedcache.get('githubpem', privateKey => {
            if (!privateKey) {
                return sendback(false);
            }

            log('GitHub', 'Signing JSON web token', 'info');
            sendback(JWSlib.sign({
                header : { alg: 'RS256' },
                payload : {
                    iat : Math.floor(Date.now() / 1000),
                    exp : Math.floor(Date.now() / 1000 + 60),
                    iss : applicationID   
                },
                privateKey
            }));  
        })
    }
}

module.exports = new GitHub();
