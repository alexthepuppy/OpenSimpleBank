/* eslint-disable linebreak-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
const API_VERSION = 'v1';

async function makePOSTRequest(path, body) {
    if (typeof body == 'object') body = JSON.stringify(body);
    const request = new Request(`/api/${API_VERSION}/${path}`, {
        method: 'POST',
        body: body,
        headers: {'Content-Type': 'application/json'}
    });
    const reply = await fetch(request);
    return reply;
}

async function makeGETRequest(path) {
    const request = new Request(`/api/${API_VERSION}/${path}`, { method: 'GET' });
    const reply = await fetch(request);
    return reply;
}

async function validateIdentity() {
    const r = await makeGETRequest('account/is-logged-in');
    if (r.status != 200) return false;
    return true;
}

// eslint-disable-next-line no-undef
// module.exports = { makeGETRequest, makePOSTRequest, validateIdentity };