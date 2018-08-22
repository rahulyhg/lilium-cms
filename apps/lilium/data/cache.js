const quickCache = {};
const sessionCache = {};

const LILIUM_CACHE_KEY = "LiliumV4";
export const CACHEKEYS = {
    SIDEBARSNAP : "sb1",
    API : "api"
};

export function getAPI(key) {
    return quickCache[CACHEKEYS.API + key];
}

export function storeAPI(key, value) {
    quickCache[CACHEKEYS.API + key] = value;
}

export function storeLocal(key, value) {
    log('Cache', 'Storing local cache value at key : ' + key, 'detail');

    quickCache[key] = value;
    window.localStorage.setItem(LILIUM_CACHE_KEY, JSON.stringify(quickCache));
}

export function getLocal(key) {
    log('Cache', 'Accessing local cache at : ' + key, 'detail');
    return quickCache[key];
}

export function setSession(key, value) {
    sessionCache[key] = value;
}

export function getSession(key) {
    return sessionCache[key]
}

export function mapUsers(users) {
    const obj= {};
    users.forEach(user => {
        obj[user._id] = user;
    });

    return obj;
}

export function initLocal() {
    log('Cache', 'Initializing local storage dump into RAM', 'success');
    if (!window.localStorage) {
        window.localStorage = {
            setItem() {},
            getItem() {}
        };
    }

    const loadedCache = JSON.parse(window.localStorage.getItem(LILIUM_CACHE_KEY) || "{}");
    Object.keys(loadedCache).forEach(k => { quickCache[k] = loadedCache[k]; });
}

export function dumpCache() {
    return { application : quickCache, session : sessionCache };
}