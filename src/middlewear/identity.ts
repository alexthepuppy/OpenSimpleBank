// Imports
import { Router } from 'express';
import { TokenData, validateToken } from '../utils/identity';
import winston from 'winston';

// Create our apps
// const SessionMiddlewear = Router();
const IdentityExtractionMiddlewear = Router();
const IdentityRequirementMiddlewear = Router();

IdentityExtractionMiddlewear.use(async (req, res, next) => {
    const logger: winston.Logger = res.locals.log;
    logger.info('Attempting to authorized request...');

    // Step 1. Get our token
    const token = req.cookies['token'];

    // Check the token
    if (token == null || token == undefined) {
        logger.info('Not authorised! No token provided.');
        next();
    } else {
        logger.info('Found identity token!');
        const _tbuff = Buffer.from(token, 'base64').toString('utf-8');
        const tokenBody: TokenData = JSON.parse(_tbuff);
        // console.log(token);
        try {
            const isTokenValid = await validateToken(tokenBody.publicKey, tokenBody.privateKey!);
            logger.info(`The token is ${(isTokenValid) ? '' : 'not'} valid`);
            if (isTokenValid) {
                res.locals.token = token;
                res.locals.userid = tokenBody.userId;
                res.locals.applicationid = tokenBody.applicationId;
                res.locals.tokenData = tokenBody;
            }
            return next();
        } catch(e) {
            logger.info('Error validating identity!');
            next();
        }
    }
});

IdentityRequirementMiddlewear.use(IdentityExtractionMiddlewear, async (req, res, next) => {
    const logger: winston.Logger = res.locals.log;
    const token: TokenData | undefined = res.locals.token;

    logger.debug('Passing through mandatory authorisation boundry!');
    if (token == undefined) {
        logger.warn('Failed to validate identity, rejecting traffic!');
        return res.sendAPIResponse({
            status: false,
            code: 401,
            message: 'Unauthorized!'
        });
    }
    return next();
});

// Export the app :D
export { IdentityExtractionMiddlewear, IdentityRequirementMiddlewear };