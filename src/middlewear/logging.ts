import { Router } from 'express';
import winston from 'winston';
import { consoleTransport } from '../logger';

export const LoggingMiddlewear = Router();

export const httpLogTransport = new winston.transports.File(
    { filename: 'logs/http.log', format: winston.format.simple() }
);

export const httpLog = winston.createLogger({
    transports: [consoleTransport, httpLogTransport]
});

LoggingMiddlewear.use(async (req, res, next) => {
    res.locals.log = httpLog;
    next();
});