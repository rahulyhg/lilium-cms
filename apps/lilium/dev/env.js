import API from '../data/api';

export function initializeDevEnv() {
    log('Dev', 'Initialize development environment', 'detail');
    global.__REBUILD_LILIUM_V4 = API.rebuild;

    log('Dev', 'Ready for some development', 'success');
    log('Dev', 'In the console, you can rebuild Lilium V4 by calling __REBUILD_LILIUM_V4()', 'lilium');
}