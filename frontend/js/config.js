(function () {
    const DEFAULT_API_BASE = window.location.origin + '/api';
    const DEPLOY_API_BASE = '';
    const DEPLOY_API_ENDPOINTS = {};
    const APPWRITE_FUNCTION_URL = 'https://fra.cloud.appwrite.io/v1/functions/69bdb7da000754098ed0/executions';
    const APPWRITE_PROJECT_ID = '69bdb29998768a4c0a9e';

    if (!window.APP_CONFIG) {
        window.APP_CONFIG = {};
    }

    const appwriteEndpoints = APPWRITE_FUNCTION_URL
        ? {
            '/matrix/operate': APPWRITE_FUNCTION_URL,
            '/markov/operate': APPWRITE_FUNCTION_URL,
            '/queues/operate': APPWRITE_FUNCTION_URL,
        }
        : {};

    window.APP_CONFIG.API_BASE = DEPLOY_API_BASE || window.APP_CONFIG.API_BASE || DEFAULT_API_BASE;
    window.APP_CONFIG.API_ENDPOINTS = {
        ...appwriteEndpoints,
        ...(window.APP_CONFIG.API_ENDPOINTS || {}),
        ...DEPLOY_API_ENDPOINTS,
    };

    window.resolveApiUrl = function (path) {
        const endpoints = (window.APP_CONFIG && window.APP_CONFIG.API_ENDPOINTS) || {};
        if (endpoints[path]) {
            let endpoint = endpoints[path];
            const needsProject = endpoint.includes('cloud.appwrite.io/v1/functions/') && endpoint.includes('/executions');
            if (needsProject && APPWRITE_PROJECT_ID && !endpoint.includes('project=')) {
                const separator = endpoint.includes('?') ? '&' : '?';
                endpoint = `${endpoint}${separator}project=${encodeURIComponent(APPWRITE_PROJECT_ID)}`;
            }
            return endpoint;
        }
        const base = window.APP_CONFIG.API_BASE || DEFAULT_API_BASE;
        return `${base}${path}`;
    };

    window.buildApiHeaders = function () {
        const headers = { 'Content-Type': 'application/json' };
        if (APPWRITE_PROJECT_ID) {
            headers['X-Appwrite-Project'] = APPWRITE_PROJECT_ID;
        }
        return headers;
    };

    window.buildApiPayload = function (path, payload) {
        return {
            ...payload,
            _route: path,
        };
    };
})();
