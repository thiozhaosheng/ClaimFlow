const http = require('http');
const logUtil = require('./logUtil');
const config = require('./config/config');

const BASE_SERVICE_CONFIG = {
    host: config.baseServiceHost,
    port: config.baseServicePort,
    timeout: config.baseServiceTimeout
};

const makeInternalRequest = (method, path, data = null, token = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_SERVICE_CONFIG.host,
            port: BASE_SERVICE_CONFIG.port,
            path: path.startsWith('/api') ? path : `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = token;
        }

        logUtil.info(`[Feign] Calling Base Service: ${method} ${options.path}`);

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                logUtil.info(`Base Service responded with status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 400) reject(parsed);
                    else resolve(parsed);
                } catch (e) {
                    reject({ status: 'error', message: 'Invalid JSON from Base Service' });
                }
            });
        });

        req.on('error', (err) => reject({ status: 'error', message: `Base Service Unreachable: ${err.message}` }));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

module.exports = {
    fetchClaims: (token) => makeInternalRequest('GET', '/claims', null, token),
    createClaim: (claimData, token) => makeInternalRequest('POST', '/claims', claimData, token),
    updateClaimStatus: (claimId, statusData, token) => makeInternalRequest('PATCH', `/workflow/review/${claimId}`, statusData, token),
    verifyUser: (credentials) => makeInternalRequest('POST', '/users/verify', credentials),
    registerUser: (userData) => makeInternalRequest('POST', '/users/register', userData),
    updatePassword: (updateData, token) => makeInternalRequest('PATCH', '/users/update-password', updateData, token)
};
