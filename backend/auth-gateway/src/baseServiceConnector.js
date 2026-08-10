const http = require('http');
const crypto = require('crypto');
const logUtil = require('./logUtil');
const config = require('./config/config');

const BASE_SERVICE_CONFIG = {
    host: config.baseServiceHost,
    port: config.baseServicePort,
    timeout: config.baseServiceTimeout
};

/**
 * A non-2xx response from the Base Service, carrying what it actually said.
 *
 * Rejections used to be the parsed body alone, which threw away res.statusCode.
 * Every controller then had to invent a status in its catch block, so a 403
 * reached the browser as 500, a 422 policy rejection as a generic 400, and a
 * 500 as 401 — the last genuinely misleading, since a broken database then
 * reads to the user as a wrong password.
 *
 * Carrying the status and the body lets the gateway relay what happened rather
 * than guess. `status` is kept on the instance so any code still reading that
 * field off the rejection behaves as before.
 */
class BaseServiceError extends Error {
    constructor(statusCode, body) {
        super(body?.message || `Base Service responded with ${statusCode}`);
        this.name = 'BaseServiceError';
        this.upstreamStatus = statusCode;
        this.body = body;
        this.status = body?.status || 'error';
    }
}

// OCR (Azure Document Intelligence) + blob upload can legitimately take much
// longer than a normal CRUD call — give it its own generous ceiling instead
// of reusing the short default meant for plain JSON round-trips.
const RECEIPT_PARSE_TIMEOUT_MS = 45_000;

// Rebuild a single-file multipart/form-data body to forward to the Base
// Service. We proxy raw bytes rather than re-encoding as JSON so the
// receipt buffer (image/PDF) survives the hop unchanged.
const buildMultipartBody = (fieldName, file) => {
    const boundary = `ClaimFlowGateway${crypto.randomBytes(16).toString('hex')}`;
    const head = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${file.originalname.replace(/"/g, '')}"\r\n` +
        `Content-Type: ${file.mimetype}\r\n\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    return {
        body: Buffer.concat([head, file.buffer, tail]),
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
};

// Like makeInternalRequest, but forwards a pre-built raw body (e.g. multipart
// file upload) instead of JSON-encoding a plain object, and allows a custom
// timeout for slow downstream calls (OCR, blob storage).
const makeInternalRequestRaw = (method, path, body, contentType, token = null, timeoutMs = BASE_SERVICE_CONFIG.timeout) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_SERVICE_CONFIG.host,
            port: BASE_SERVICE_CONFIG.port,
            path: path.startsWith('/api') ? path : `/api${path}`,
            method: method,
            headers: {
                'Content-Type': contentType,
                'Content-Length': body.length,
            },
        };

        if (token) {
            options.headers['Authorization'] = token;
        }

        logUtil.info(`[Feign] Calling Base Service (raw): ${method} ${options.path}`);

        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const responseBody = Buffer.concat(chunks).toString('utf8');
                logUtil.info(`Base Service responded with status: ${res.statusCode}`);
                try {
                    const parsed = JSON.parse(responseBody);
                    if (res.statusCode >= 400) reject(new BaseServiceError(res.statusCode, parsed));
                    else resolve(parsed);
                } catch (e) {
                    reject({ status: 'error', message: 'Invalid JSON from Base Service' });
                }
            });
        });

        req.on('error', (err) => reject({ status: 'error', message: `Base Service Unreachable: ${err.message}` }));
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`Base Service timed out after ${timeoutMs}ms`));
        });

        req.write(body);
        req.end();
    });
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
                    if (res.statusCode >= 400) reject(new BaseServiceError(res.statusCode, parsed));
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
    BaseServiceError,
    fetchClaims: (token) => makeInternalRequest('GET', '/claims', null, token),
    createClaim: (claimData, token) => makeInternalRequest('POST', '/claims', claimData, token),
    updateClaimStatus: (claimId, statusData, token) => makeInternalRequest('PATCH', `/workflow/review/${claimId}`, statusData, token),
    getReceiptViewUrl: (claimId, token) => makeInternalRequest('GET', `/claims/${claimId}/receipt`, null, token),
    parseReceipt: (file, token) => {
        const { body, contentType } = buildMultipartBody('receipt', file);
        return makeInternalRequestRaw('POST', '/claims/parse-receipt', body, contentType, token, RECEIPT_PARSE_TIMEOUT_MS);
    },
    verifyUser: (credentials) => makeInternalRequest('POST', '/users/verify', credentials),
    registerUser: (userData) => makeInternalRequest('POST', '/users/register', userData),
    updatePassword: (updateData, token) => makeInternalRequest('PATCH', '/users/update-password', updateData, token),
    authLogin: (credentials) => makeInternalRequest('POST', '/auth/login', credentials),
    authMe: (token) => makeInternalRequest('GET', '/auth/me', null, token),
    authForgotPassword: (data) => makeInternalRequest('POST', '/auth/forgot-password', data)
};
