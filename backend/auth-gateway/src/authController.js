const jwt = require('jsonwebtoken');
const baseServiceConnector = require('./baseServiceConnector');
const logUtil = require('./logUtil');
const config = require('./config/config');

/**
 * Relays a Base Service failure to the client with the status it actually had.
 *
 * Each handler used to answer its catch block with one hardcoded status, so
 * every failure of a given endpoint looked identical no matter the cause: an
 * Employee forbidden from GET /claims (403) and the service being down (500)
 * both arrived as 500 "Proxy Failed", and a policy engine rejection (422) lost
 * the explanation of which rule fired.
 *
 * When the rejection came from the Base Service its status and body are passed
 * through, so the browser sees what the API decided. Anything else — a socket
 * error, a timeout, malformed JSON — is a genuine gateway-side fault and keeps
 * the caller's fallback, since no upstream status exists to relay.
 */
const relayError = (res, err, fallbackStatus, fallbackMessage) => {
    if (err instanceof baseServiceConnector.BaseServiceError) {
        return res.status(err.upstreamStatus).json(
            err.body ?? { status: 'error', message: err.message },
        );
    }
    return res.status(fallbackStatus).json({ status: 'error', message: fallbackMessage });
};

exports.login = async (req, res) => {
    try {
        const credentials = req.body;
        logUtil.info(`Login attempt: ${credentials.email}`);

        const result = await baseServiceConnector.verifyUser(credentials);
        const user = result.data.user;
        logUtil.info(`User verified: ${user.email} [${user.role}]`);

        const token = jwt.sign(
            { id: user.id, role: user.role },
            config.jwtSecret,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            status: 'success',
            token: token,
            data: { user: user }
        });
    } catch (err) {
        logUtil.error('Login controller failed', err);
        relayError(res, err, 401, 'Authentication Failed');
    }
};

exports.register = async (req, res) => {
    try {
        const userData = req.body;
        const result = await baseServiceConnector.registerUser(userData);
        res.status(201).json(result);
    } catch (err) {
        logUtil.error('Registration controller failed', err);
        relayError(res, err, 400, 'Registration Failed');
    }
};

exports.updatePassword = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const updateData = req.body;
        const result = await baseServiceConnector.updatePassword(updateData, token);
        res.status(200).json(result);
    } catch (err) {
        logUtil.error('Password update controller failed', err);
        relayError(res, err, 401, 'Update Failed');
    }
};

exports.getAllClaims = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const data = await baseServiceConnector.fetchClaims(token);
        res.status(200).json(data);
    } catch (err) {
        relayError(res, err, 500, 'Proxy Failed');
    }
};

exports.createClaim = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const claimData = req.body;
        logUtil.info('Proxying new claim submission...');
        const result = await baseServiceConnector.createClaim(claimData, token);
        res.status(201).json(result);
    } catch (err) {
        relayError(res, err, 400, 'Failed to create claim');
    }
};

exports.reviewClaim = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const statusData = req.body;
        logUtil.info(`Proxying review for claim ID: ${id}`);
        const result = await baseServiceConnector.updateClaimStatus(id, statusData, token);
        res.status(200).json(result);
    } catch (err) {
        relayError(res, err, 400, 'Review action failed');
    }
};

exports.parseReceipt = async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ status: 'error', message: 'No receipt file uploaded' });
    }
    try {
        const token = req.headers.authorization;
        logUtil.info(`Proxying receipt OCR upload: ${file.originalname} (${file.size} bytes)`);
        const result = await baseServiceConnector.parseReceipt(file, token);
        res.status(200).json(result);
    } catch (err) {
        logUtil.error('Receipt parse proxy failed', err);
        relayError(res, err, 502, 'Receipt parsing failed');
    }
};

exports.getReceiptViewUrl = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const result = await baseServiceConnector.getReceiptViewUrl(id, token);
        res.status(200).json(result);
    } catch (err) {
        relayError(res, err, 400, 'Failed to fetch receipt URL');
    }
};

// These three used to answer with `res.json(err)`, which worked only because a
// rejection *was* the parsed body. Now that it is a BaseServiceError, that would
// serialise the error object instead — and Error#message is not enumerable, so
// the client would receive a shape with no message at all. They go through the
// same relay as everything else.
exports.authLogin = async (req, res) => {
    try {
        const result = await baseServiceConnector.authLogin(req.body);
        res.status(200).json(result);
    } catch (err) {
        logUtil.error('Auth login proxy failed', err);
        relayError(res, err, 401, 'Authentication failed');
    }
};

exports.authMe = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const result = await baseServiceConnector.authMe(token);
        res.status(200).json(result);
    } catch (err) {
        relayError(res, err, 401, 'Not authenticated');
    }
};

exports.authForgotPassword = async (req, res) => {
    try {
        const result = await baseServiceConnector.authForgotPassword(req.body);
        res.status(200).json(result);
    } catch (err) {
        relayError(res, err, 400, 'Password reset request failed');
    }
};
