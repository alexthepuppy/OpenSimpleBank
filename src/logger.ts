// Imports
import winston from 'winston';

// Define the logger
export const consoleTransport = new winston.transports.Console({ format: winston.format.cli() });

const combined_file_transport = new winston.transports.File({ 
    filename: 'logs/combined.log', format: winston.format.simple() 
});
const api_file_transport = new winston.transports.File(
    { filename: 'logs/api.log', format: winston.format.simple() }
);
const http_file_transport = new winston.transports.File(
    { filename: 'logs/http.log', format: winston.format.simple() }
);

const sessionLogs: {[key: string]: winston.Logger} = {};

export function openSessionLog(sessionKey: string): winston.Logger {
    let log = sessionLogs[sessionKey];
    if (log == undefined) {
        const transport = new winston.transports.File({
            filename: `logs/sessions/${sessionKey}.json`,
            format: winston.format.json()
        });

        log = winston.createLogger({
            transports: [transport]
        });

        sessionLogs[sessionKey] = log;
    }
    return log;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const myWinstonOptions = {
    transports: [consoleTransport]
};

const api_log = winston.createLogger({
    transports: [ api_file_transport, consoleTransport ]
});

const live_log = winston.createLogger({
    transports: [consoleTransport, combined_file_transport]
});

const http_log = winston.createLogger({
    transports: [consoleTransport, http_file_transport, combined_file_transport]
});

export default live_log;
export { api_log, live_log, http_log };