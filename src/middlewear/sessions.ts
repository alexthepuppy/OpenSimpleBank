import { Router } from 'express';
import { v4 } from 'uuid';
import winston from 'winston';
import { openSessionLog } from '../logger';

export const SessionTrackingMiddlewear = Router();

export class UserSession {
    public readonly id: string;
    public readonly log: winston.Logger;
    
    constructor(id: string) {
        this.id = id;
        this.log = openSessionLog(id);
    }
}

SessionTrackingMiddlewear.use(async (req, res, next) => {
    const logger: winston.Logger = res.locals.log;
    
    let sessionToken = req.cookies['xref'];
    if (sessionToken == null || sessionToken == undefined) {
        sessionToken = v4();
        logger.info('Found new session!');
        logger.debug(`Assigning token "${sessionToken}"`);
    }

    res.locals.session = new UserSession(sessionToken);
    next();
});