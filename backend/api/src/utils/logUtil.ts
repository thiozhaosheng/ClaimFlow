
export const logUtil = {
    info: (message: string, data: any = null) => {
        const timestamp = new Date().toISOString();
        if (data !== null) {
            console.log(`[${timestamp}] INFO: ${message}`, data);
        } else {
            console.log(`[${timestamp}] INFO: ${message}`);
        }
    },
    error: (message: string, error: any = null) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR: ${message}`);
        if (error !== null) console.error(error);
    }
};