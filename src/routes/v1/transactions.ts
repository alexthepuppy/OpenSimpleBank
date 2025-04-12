// Imports
import { Router } from 'express';
// import logger from '../logger';
import { PrismaClient } from '@prisma/client';
import { beginTransaction } from '../../utils/transaction';
import { BalanceInsufficentError, CurrencyMismatchError, NoSuchWalletError, UnauthorisedError } from '../../utils/errors';
import { TokenData } from '../../utils/identity';
import winston from 'winston';
import { IdentityRequirementMiddlewear } from '../../middlewear/identity';
import { validateParameter } from '../../utils/general';

// Get database connection
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dbcon = new PrismaClient();

// Create our apps
const app = Router();

app.use(IdentityRequirementMiddlewear);

app.post('/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    const tokend: TokenData  = res.locals.tokenData;
    const source_wallet_key: string = validateParameter(
        req.body.debtor, 'Debitor not provided'
    );
    const dest_wallet_key: string = validateParameter(
        req.body.creditor, 'Creditor not provided'
    );
    const trans_value: number = validateParameter(
        req.body.value, 'Value not provided'
    );

    logger.info('Processing request to create transaction.');
    try {
        const transaction_id = await beginTransaction(source_wallet_key, dest_wallet_key, trans_value, tokend.publicKey);
        return res.sendAPIResponse({
            status: true,
            message: 'Transaction started!',
            ref: transaction_id
        });
    } catch (e) {
        if (e instanceof NoSuchWalletError) {
            const offending_address = (e as NoSuchWalletError).address;
            logger.error(`Unable to find wallet (${offending_address})!`);
            return res.sendAPIResponse({
                status: false,
                code: 403,
                subcode: 10,
                message: 'The specified wallet does not exist!',
                ref: offending_address
            });
        } else if (e instanceof UnauthorisedError) {
            logger.error('User not authorised to make transaction');
            return res.sendAPIResponse({
                status: false,
                code: 401,
                subcode: 11,
                message: 'You are not authorised to make this transfer!',
            });
        } else if (e instanceof BalanceInsufficentError) {
            logger.error('Insufficent balance');
            return res.sendAPIResponse({
                status: false,
                code: 403,
                subcode: 12,
                message: 'Not enough money in source account!'
            });
        } else if (e instanceof CurrencyMismatchError) {
            logger.error('Currency mismatch');
            return res.sendAPIResponse({
                status: false,
                code: 403,
                subcode: 13,
                message: 'The destination wallet is not the same currency!'
            });
        } else {
            logger.error('Transaction failed to post');
            return res.sendAPIResponse({
                status: false,
                code: 500,
                subcode: 14,
                message: 'Transaction failed to be posted'
            });
        }
    }
});

// Export the app :D
export default app;