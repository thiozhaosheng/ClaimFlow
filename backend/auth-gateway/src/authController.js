const jwt = require('jsonwebtoken');
const baseServiceConnector = require('./baseServiceConnector');
const logUtil = require('./logUtil');
const config = require('./config/config');

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

        // Strip passwordHash from the response — the frontend reads body.user
        // and must never receive the password hash.
        const { passwordHash, ...safeUser } = user;

        res.status(200).json({
            status: 'success',
            token: token,
            user: safeUser
        });
    } catch (err) {
        logUtil.error('Login controller failed', err);
        res.status(401).json({ status: 'error', message: 'Authentication Failed' });
    }
};

exports.register = async (req, res) => {
    try {
        const userData = req.body;
        const result = await baseServiceConnector.registerUser(userData);
        res.status(201).json(result);
    } catch (err) {
        logUtil.error('Registration controller failed', err);
        res.status(400).json({ status: 'error', message: 'Registration Failed' });
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
        res.status(401).json({ status: 'error', message: 'Update Failed' });
    }
};

exports.getAllClaims = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const data = await baseServiceConnector.fetchClaims(token);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Proxy Failed' });
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
        res.status(400).json({ status: 'error', message: 'Failed to create claim' });
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
        res.status(400).json({ status: 'error', message: 'Review action failed' });
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
        res.status(502).json({ status: 'error', message: 'Receipt parsing failed' });
    }
};

exports.getReceiptViewUrl = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const result = await baseServiceConnector.getReceiptViewUrl(id, token);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ status: 'error', message: 'Failed to fetch receipt URL' });
    }
};

exports.getMyClaims = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const data = await baseServiceConnector.fetchMyClaims(token);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Proxy Failed' });
    }
};

exports.getClaimById = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const data = await baseServiceConnector.fetchClaimById(id, token);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Proxy Failed' });
    }
};

exports.getClaimActivity = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const data = await baseServiceConnector.fetchClaimActivity(id, token);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Proxy Failed' });
    }
};

exports.addClaimComment = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const result = await baseServiceConnector.addClaimComment(id, req.body, token);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ status: 'error', message: 'Failed to add comment' });
    }
};

exports.updateClaimFields = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const result = await baseServiceConnector.updateClaimFields(id, req.body, token);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ status: 'error', message: 'Failed to update claim' });
    }
};

exports.markClaimPaid = async (req, res) => {
    try {
        const token = req.headers.authorization;
        const { id } = req.params;
        const result = await baseServiceConnector.markClaimPaid(id, req.body, token);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ status: 'error', message: 'Payout action failed' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ status: 'error', message: 'Email is required' });
        }
        const result = await baseServiceConnector.forgotPassword(email);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ status: 'error', message: 'Password reset request failed' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ status: 'error', message: 'No token provided' });
        }
        const result = await baseServiceConnector.fetchProfile(token);
        res.status(200).json(result);
    } catch (err) {
        res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
};
