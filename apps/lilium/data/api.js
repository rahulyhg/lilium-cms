class API {
    static get(endpoint, params = {}, sendback) {
        log('API', 'Requesting to endpoint : ' + endpoint, 'detail');
        fetch(`/livevars/v4${endpoint}?p=${JSON.stringify(params)}`, { credentials : "include" }).then(r => {
            if (Math.floor(r.status / 200) == 1) {
                log('API', '['+ r.status +'] API call to ' + endpoint, 'success');
                r.json().then(resp => {
                    log('API', 'JSON parsed successfully', 'detail');
                    sendback(undefined, resp);
                }).catch(err => {
                    console.log(err);
                    log('API', 'JSON failed to parse', 'warn');
                    sendback(err);
                });
            } else {               
                log('API', '['+r.status+'] API call to ' + endpoint, 'warn');
                sendback(undefined, {
                    code : r.status,
                    response : r
                });
            }
        });
    }

    /**
     * 
     * @param {array} payload 
     * @param {*} sendback
     * 
     * Payload : [
     *   { endpoint : "/endpoint/and/levels", params : { key : "value" } },
     *   ...
     * ] 
     */
    static getMany(payload, sendback) {
        const responses = {};
        let doneIndex = 0;

        const requestDone = (req, err, resp) => {
            responses[req.endpoint] = err || resp;
            ++doneIndex == payload.length && sendback(responses);
        }

        log('API', 'Requesting to multiple endpoints. Total : ' + payload.length, 'detail');
        payload.forEach(req => API.get(req.endpoint, req.params, (err, resp) => requestDone(req, err, resp)));
    }
}

export default API;