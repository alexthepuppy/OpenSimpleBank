// Imports
import { Router } from 'express';
import { TokenData, createUser, generateUserToken, validateUserLogin } from '../../utils/identity';
import { PrismaClient } from '@prisma/client';
import { validateParameter } from '../../utils/general';
import { canUserLogin } from '../../utils/permissions';
import winston from 'winston';
import { IdentityRequirementMiddlewear } from '../../middlewear/identity';
import { UnauthorisedError } from '../../utils/errors';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.post('/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;

    logger.info('Processing account creation request');
    const username: string = validateParameter(req.body.username, 'Username not provided!');
    const password: string = validateParameter(req.body.password, 'Password not provided!');
    
    logger.debug(`Attempting to create account with username "${username}"!`);

    const user = await createUser(username, password, undefined);
    logger.info('Account creation successful');

    return res.sendAPIResponse({
        status: true,
        ref: user.id,
        result: user
    });
});

app.post('/login/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    const username: string = validateParameter(req.body.username, 'Missing username!');
    const password: string = validateParameter(req.body.password, 'Missing password!');

    logger.info('Processing user login request');

    const userId = await validateUserLogin(username, password);
    logger.info('Validated credentials.');

    const allowed = await canUserLogin(userId);

    if (allowed) {
        logger.info('Account is permitted to login.');

        const token = await generateUserToken(userId);
        const tokenData = token;
        const tokenString = Buffer.from(JSON.stringify(tokenData), 'utf-8').toString('base64');

        logger.info('Account login successful.');

        res.cookie('token', tokenString, { httpOnly: true, expires: tokenData.expiresOn });
        return res.sendAPIResponse({
            status: true,
            message: 'Login successful!',
            result: tokenString,
            ref: token.userId
        });
    } else {
        logger.warn('Account is restricted from logging in.');
        return res.sendAPIResponse({
            status: false,
            code: 401,
            message: 'This account is forbidden from logging in',
            ref: userId
        });
    }

});

app.get('/is-logged-in/', IdentityRequirementMiddlewear, async (req, res) => {
    const tokend: TokenData  = res.locals.tokenData;
    return res.sendAPIResponse({
        status: true,
        message: 'You are logged in!',
        ref: tokend.userId
    });
});

app.get('/:username/applications/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    const tokend: TokenData | undefined = res.locals.tokenData;
    const username: string = req.params.username;
    const onlyShowOwnedApplications = req.query.owned;

    logger.info(`Processing query for listing all applications for (${username})`);

    type filterType = { id?: string, username?: string, isOwner?: boolean  };
    let filter: filterType = 
    (onlyShowOwnedApplications) 
        ? { username: username, isOwner: true } 
        : { username: username };

    if (username == '@me') {
        if (tokend == undefined) 
            throw new UnauthorisedError();
        filter = (onlyShowOwnedApplications) 
            ? { id: tokend.userId, isOwner: true } 
            : { id: tokend.userId };
    }

    const applications = await dbcon.application.findMany({ 
        where: { Memberships: { some: { Account: filter } }},
        select: { id: true, displayName: true, description: true, icon_uri: true, isPublic: true }
    });

    logger.info('Successfully processed request!');
    return res.sendAPIResponse({
        status: true,
        result: applications
    });
});

app.get('/:username/currencies/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    const username: string = validateParameter(req.params.username, 'Username not provided!');
    const tokend: TokenData | undefined = res.locals.tokenData;

    logger.info(`Received request to list AssetTypes belonging to user "${username}"`);

    if (tokend == undefined && req.params.username == '@me')
        throw new UnauthorisedError();
    const filter = (tokend != undefined && req.params.username == '@me')
        ? { isOwner: true, accountId: tokend.userId }
        : { isOwner: true, Account: { username: username } };

    logger.info('Fetching currency list from database');
    const list = await dbcon.currency.findMany({
        where: { Owner: { Memberships: { some: filter }} },
        select: {
            id: true,
            ownerId : true,
            public : true,
            currencySign : true,
            groupingSize : true,
            decimalCount : true,
            shortName : true,
            longName : true,
            liquidity : true,
            volume : true
        }
    });

    logger.info('Currency list received successfully');
    return res.sendAPIResponse({
        status: true,
        message: 'Fetched list of owned AssetTypes!',
        ref: tokend?.userId,
        result: list,
    });
});

// Export the app :D
export default app;