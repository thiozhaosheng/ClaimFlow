require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const authController = require('./src/authController');
const logUtil = require('./src/logUtil');
const config = require('./src/config/config');

const app = express();
const PORT = config.gatewayPort;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logUtil.info(`[Gateway] ${req.method} ${req.url}`);
    next();
});

app.use(express.static(path.join(__dirname, config.staticFolder)));

app.post('/api/users/login', authController.login);
app.post('/api/users/register', authController.register);
app.patch('/api/users/update-password', authController.updatePassword);

app.get('/api/claims', authController.getAllClaims);
app.post('/api/claims', authController.createClaim);

app.patch('/api/workflow/review/:id', authController.reviewClaim);

app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Endpoint not found' });
});

app.listen(PORT, () => {
    logUtil.info(`Auth Gateway is LIVE on port ${PORT}`);
});
