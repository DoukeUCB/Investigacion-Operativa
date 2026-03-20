(function () {
    const DEFAULT_API_BASE = window.location.origin + '/api';
    const DEPLOY_API_BASE = ''; // Ej: 'https://tu-backend.onrender.com/api'
    const APPWRITE_FUNCTION_URL = ''; // Ej: 'https://fra.cloud.appwrite.io/v1/functions/<functionId>/executions'
    const DEPLOY_API_ENDPOINTS = {
        // '/matrix/operate': 'https://<appwrite-function-url>',
        // '/markov/operate': 'https://<appwrite-function-url>',
        // '/queues/operate': 'https://<appwrite-function-url>',
    };

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
        if (endpoints[path]) return endpoints[path];
        const base = window.APP_CONFIG.API_BASE || DEFAULT_API_BASE;
        return `${base}${path}`;
    };

    window.buildApiPayload = function (path, payload) {
        return {
            ...payload,
            _route: path,
        };
    };
})();
