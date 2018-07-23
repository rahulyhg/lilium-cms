const quickCache = {};

const LILIUM_CACHE_KEY = "LiliumV4";
export const CACHEKEYS = {
    SIDEBARSNAP : "sb1"
};

export function storeLocal(key, value) {
    log('Cache', 'Storing local cache value at key : ' + key, 'detail');

    quickCache[key] = value;
    window.localStorage.setItem(LILIUM_CACHE_KEY, JSON.stringify(quickCache));
}

export function getLocal(key) {
    log('Cache', 'Accessing local cache at : ' + key, 'detail');
    return quickCache[key];
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