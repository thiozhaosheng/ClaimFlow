module.exports = {
    gatewayPort: process.env.PORT || 3001,
    baseServiceHost: process.env.BASE_SERVICE_HOST || 'claimflow-base.azurewebsites.net',
    baseServicePort: process.env.BASE_SERVICE_PORT || 3000,
    baseServiceTimeout: parseInt(process.env.BASE_SERVICE_TIMEOUT) || 5000,
    jwtSecret: process.env.JWT_SECRET || '***REDACTED***',
    staticFolder: process.env.STATIC_FOLDER || 'test'
};
