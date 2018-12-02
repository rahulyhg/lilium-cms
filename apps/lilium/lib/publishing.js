import API from '../data/api';

export function savePost(postid, edits, done) {
    API.put('/publishing/save/' + postid, edits, (err, json, r) => {
        done(r.status != 200 && r.responseText, json || {}, r);
    });
}

export function validatePost(postid, done) {
    API.put('/publishing/validate/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && r.responseText, { valid : r.status == 200 });
    });
}

export function getPublicationReport(postid, done) {
    API.get('/publishing/report/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && r.responseText, json || {});
    });
}

export function getPostForEdit(postid, send) {
    const endpoints = {
        post : { endpoint : "/publishing/write/" + postid, params : {} },
        history : { endpoint : "/publishing/history/" + postid, params : {} }
    };

    API.getMany(Object.keys(endpoints).map(key => endpoints[key]), (err, resp) => {
        const post = resp[endpoints.post.endpoint];
        const history = resp[endpoints.history.endpoint];

        send({
            post, history
        });
    });
}

export function refreshPost(postid, done) {
    API.put('/publishing/refresh/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && !json.ok && r.responseText, { refreshed : json.ok });
    });
}

export function destroyPost(postid, done) {
    API.delete('/publishing/destroy/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && json.error, json || {});
    });
}   

export function refusePost(postid, done) {
    API.put('/publishing/refuse/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && json.error, json || {});
    });
}

export function submitPostForApproval(postid, done) {
    API.put('/publishing/submit/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && json.error, json || {});
    });
}

export function publishPost(postid, done) {
    API.put('/publishing/publish/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && r.responseText, json || {}, r);
    });
};

export function unpublishPost(postid, done) {
    API.delete('/publishing/unpublish/' + postid, {}, (err, json, r) => {
        done(r.status != 200 && r.responseText, json || {}, r);
    });
};

export function updatePostSlug(postid, slug, done) {
    API.put("/publishing/slug/" + postid, { slug }, (err, json, r) => {
        done(json.err, json, r);
    });
};

export function getNewPreviewLink(postid, done) {
    API.delete('/publishing/previewlink/' + postid, {}, (err, json, r) => {
        done(r.status != 200, json || {}, r);
    });
};
