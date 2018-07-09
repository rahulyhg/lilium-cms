class API {
    static get(endpoint, params = {}, sendback) {
        fetch(`/livevars/v4${endpoint}?p=${JSON.stringify(params)}`, { credentials : "include" }).then(r => {
            if (r.status == 200) {
                r.json().then(resp => {
                    sendback(undefined, resp);
                }).catch(err => {
                    r.text().then(txt => sendback(undefined, txt));
                });
            } else {
                sendback({
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

        const requestDone = (req, resp) => {
            responses[req.endpoint] = resp;

            if (++doneIndex == payload.length) {
                sendback(responses);
            }
        }

        payload.forEach(req => {
            API.get(req.endpoint, req.params, resp => {
                requestDone(req, resp)
            })
        })
    }
}

export default API;