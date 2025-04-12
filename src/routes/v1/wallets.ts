// Imports
import { Router } from 'express';
// import logger from '../logger';
import { PrismaClient } from '@prisma/client';
import { TokenData } from '../../utils/identity';
import winston from 'winston';
import { IdentityRequirementMiddlewear } from '../../middlewear/identity';
import { meResolver, validateParameter } from '../../utils/general';

// Get database connection
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(IdentityRequirementMiddlewear);

app.post('/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    logger.info('Attempting to create wallet');

    let applicationId: string = validateParameter(
        req.body.application_id, 'No application ID specified'
    );

    {
        const mr = await meResolver(applicationId);
        if (mr != undefined)
            applicationId = mr;
    }

    const currencyId: string = validateParameter(
        req.body.currency_id, 'No currency ID specified'
    );
    const nickname: string | undefined = req.body.nickname;

    const wallet = await dbcon.wallet.create({data:{
        balance: 0,
        ownerId: applicationId,
        currencyId: currencyId,
        nickname: nickname
    }});

    if (wallet == undefined) 
        return res.sendAPIResponse({
            status: false,
            code: 500,
            message: 'Failed to create wallet!'
        });

    return res.sendAPIResponse({
        status: true,
        message: 'Wallet created!',
        ref: wallet.id
    });
});

app.get('/list/by-userid/:userId/', async (req, res) => {
    const tokend: TokenData  = res.locals.tokenData;
    const targetId: string = validateParameter(
        req.params.userId, 'No target ID specified'
    );

    let query: { 
        ownerId?: string, 
        Memberships?: { some?: { accountId?: string } } 
    } = { ownerId: targetId };

    if (targetId == '@me' || targetId == undefined || targetId == '') {
        const userId = validateParameter<string>(tokend.userId, 'Attempted to use @me without being logged in');
        query = { Memberships: { some: { accountId: userId} }};
    }

    const wallets = await dbcon.wallet.findMany({
        where: { Owner: query },
        select: { id: true, balance: true, nickname: true }
    });

    return res.sendAPIResponse({
        status: false,
        message: 'Got all of user\'s wallets',
        ref: targetId,
        result: wallets
    });
});

app.get('/:address/transactions/', async (req, res) => {
    // const tokend: TokenData = res.locals.tokenData;
    const wallet_address: string = req.params.address;

    const transactions = await dbcon.transaction.findMany({
        where: {
            OR: [
                { debtorId: wallet_address },
                { creditorId: wallet_address }
            ]
        },
        select: {
            id: true,
            debtorId: true,
            creditorId: true,
            value: true,
            partialValue: true,
            status: true,
            createdOn: true,
            lastUpdatedOn: true,
            debtorHeadline: true,
            debtorDescription: true
        }
    });

    return res.sendAPIResponse({
        status: true,
        result: transactions
    });
});

// Export the app :D
export default app;