const timestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const logUtil = {
    info: (message, data = '') => {
        console.log(`[${timestamp()}] INFO: ${message}`, data);
    },
    error: (message, error = '') => {
        console.error(`[${timestamp()}] ERROR: ${message}`);
        if (error) console.error(error);
    }
};

module.exports = logUtil;
