class API {
    static request(method = "GET", endpoint, params = {}, data, sendback) {
        log('API', 'Requesting ' + method + ' to endpoint : ' + endpoint, 'detail');
        fetch(`${endpoint}?p=${JSON.stringify(params)}`, { credentials : "include", method, body : data && JSON.stringify(data), headers: data && { "Content-Type": "application/json" } }).then(r => {
            if (Math.floor(r.status / 200) == 1) {
                log('API', '['+ r.status +'] API call to ' + endpoint, 'success');
                r.json().then(resp => {
                    log('API', 'JSON parsed successfully', 'detail');
                    sendback(undefined, resp, r);
                }).catch(err => {
                    log('API', 'JSON failed to parse', 'warn');
                    sendback(err, undefined, r);
                });
            } else {               
                log('API', '['+r.status+'] API call to ' + endpoint, 'warn');
                sendback(undefined, {
                    code : r.status,
                    response : r
                }, r);
            }
        });
    }

    static get(endpoint, params, sendback) {
        API.request('GET', "/livevars/v4" + endpoint, params, undefined, sendback);
    }

    static post(endpoint, data, sendback) {
        API.request('POST', "/admin" + endpoint, {}, data, sendback);
    }

    static rebuild() {
        log('Lilium', 'Rebuilding Lilium V4 Preact app', 'detail');
        API.post('/build/lilium', {}, () => { 
            log('Lilium', 'Finish building Lilium V4', 'success'); 
            document.location.reload();
        });
    }

    static upload(blob, sendback) {
        log('API', 'Uploading file to V4 quick upload endpoint', 'detail');
        fetch(`/admin/mediaUpload`, { credentials : "include", method : "POST", body : blob}).then(r => {
            if (r.status == 200) {
                log('API', '[200] Uploaded file successfully', 'success');
                r.json().then(json => {
                    sendback(undefined, json);
                })
            } else {               
                log('API', '['+r.status+'] File upload failed', 'warn');
                sendback(r.status);
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