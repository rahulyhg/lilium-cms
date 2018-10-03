import { getAPI, storeAPI } from './cache';

class API {
    static request(method = "GET", endpoint, params = {}, data, sendback, resptype = "json") {
        log('API', 'Requesting ' + method + ' to endpoint : ' + endpoint, 'detail');
        const now = Date.now();
        fetch(`${endpoint}?p=${JSON.stringify(params)}`, { credentials : "include", method, body : data && JSON.stringify(data), headers: data && { "Content-Type": "application/json" } }).then(r => {
            if (Math.floor(r.status / 200) == 1) {
                log('API', '['+ r.status +'] API call to ' + endpoint + ' replied in ' + (Date.now() - now) + "ms", 'success');
                r[resptype]().then(resp => {
                    log('API', resptype + ' parsed successfully', 'detail');
                    sendback(undefined, resp, r);
                }).catch(err => {
                    log('API', resptype + ' failed to parse for endpoint ' + endpoint, 'warn');
                    sendback(err, undefined, r);
                });
            } else {               
                log('API', '['+r.status+'] API call to ' + endpoint + ' replied in ' + (Date.now() - now) + "ms", 'warn');
                sendback(undefined, {
                    code : r.status,
                    response : r
                }, r);
            }
        });
    }

    static get(endpoint, params, sendback, usecache) {
        if (usecache) {
            log('API', 'Requesting endpoint data from cache at : ' + endpoint, 'detail');
            const val = getAPI(endpoint);
            if (val) {
                log('API', 'Served data from cache at : ' + endpoint, 'success');
                sendback(undefined, val, undefined);
            } else {
                API.get(endpoint, params, (err, json) => {
                    storeAPI(endpoint, json);                    
                    log('API', 'Stored data in cache at : ' + endpoint, 'success');

                    sendback(err, json);
                });
            }
        } else {
            API.request('GET', "/livevars/v4" + endpoint, params, undefined, sendback);
        }
    }

    static post(endpoint, data, sendback, resptype) {
        API.request('POST', "/admin" + endpoint, {}, data, sendback, resptype);
    }

    static put(endpoint, data, sendback, resptype) {
        API.request('PUT', '/admin' + endpoint, {}, data, sendback, resptype);
    }

    static delete(endpoint, data, sendback, resptype) {
        API.request('DELETE', '/admin' + endpoint, {}, data, sendback, resptype);
    }

    static rebuild() {
        log('Lilium', 'Rebuilding Lilium V4 Preact app', 'detail');
        API.post('/build/lilium', {}, () => { 
            log('Lilium', 'Finish building Lilium V4', 'success'); 
            document.location.reload();
        });
    }

    static upload(file, name, progress, sendback) {
        log('API', 'Uploading file to V4 quick upload endpoint', 'detail');

        const freader = new FileReader();
        freader.onload = () => {
            const ext = name.split('.').pop();
            const oReq = new XMLHttpRequest();
            oReq.addEventListener("load", ev => {
                if (oReq.status == 200) {
                    log('API', '[200] Uploaded file successfully', 'success');
                    const resp = oReq.responseText;
                    const json = JSON.parse(resp);
                    sendback(undefined, json);
                } else {               
                    log('API', '['+oReq.status+'] File upload failed', 'warn');
                    sendback(oReq.status);
                }
            });
            oReq.open("POST", `/admin/mediaUpload/${ext}`, true);
            oReq.upload.onprogress = ev => progress(ev);
            oReq.send(freader.result);
        };
        freader.readAsArrayBuffer(file);
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
        const errors = {};
        let doneIndex = 0;

        const requestDone = (req, err, resp) => {
            responses[req.endpoint] = resp;
            errors[req.endpoint] = err;
            ++doneIndex == payload.length && sendback(errors, responses);
        }

        log('API', 'Requesting to multiple endpoints. Total : ' + payload.length, 'detail');
        payload.forEach(req => API.get(req.endpoint, req.params, (err, resp) => requestDone(req, err, resp)));
    }
}

export default API;