export default class API {
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
}