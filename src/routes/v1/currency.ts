// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear, RestrictedAccessMiddlewear } from '../../middlewear/identitygate';
import { createCurrency, getListOfCurrencies, issueGrant } from '../../utils/currency';
import { canMakeCurrencyForApplication, canMakeGrantForCurrency } from '../../utils/permissions';
import { getUserApplicationId, TokenData } from '../../utils/identity';
import winston from 'winston';

// Create our apps
const currency_route = Router();

currency_route.use(OptionalIdentificationMiddlewear);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
currency_route.get('/list/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;

    logger.info('Received request to list currencies');

    getListOfCurrencies().then(currencies => {
        if (currencies == null || currencies == undefined) {
            logger.warn('Failed to fetch currency!');
            res.status(500).json({message: 'Failed to fetch currencies!'});
        } else {
            logger.info('Fetched currency list');
            res.status(200).json({message: 'Fetched currencies!', data: currencies});
        }
    });
});

currency_route.use(RestrictedAccessMiddlewear);

currency_route.post('/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    logger.info('Received request to create new currency');
    const signSymbol: string | undefined = req.body.symbol;
    const grouping: number | undefined = req.body.grouping;
    const decimalCount: number | undefined = req.body.decimals;
    const shortName: string | undefined = req.body.short_name;
    const longName: string | undefined = req.body.long_name;
    const volume: number | undefined = req.body.volume;
    const tokend: TokenData | undefined = res.locals.tokenData;
    let applicationId: string | null = req.body.application_id;

    if (tokend == undefined) 
        return res.status(401).json({ message: 'No authentication provided!' });

    if (applicationId == '@me') {
        if (tokend.userId == undefined)
            return res.status(401).json({ message: 'Attempting to use @me on undefined user' });
        applicationId = await getUserApplicationId(tokend.userId!);
    }

    if (applicationId == undefined)
        return res.status(400).json({ message: 'Missing application_id!' });
    if (signSymbol == undefined)
        return res.status(400).json({ message: 'Missing symbol sign' });
    if (shortName == undefined)
        return res.status(400).json({ message: 'Missing short name' });
    if (longName == undefined)
        return res.status(400).json({ message: 'Missing long name' });

    const allowed = await canMakeCurrencyForApplication(tokend.publicKey, applicationId);

    if (!allowed) 
        return res
            .status(401)
            .json({ 
                message: 'You are not authorised to create a currency for that application!', 
                applicationId: applicationId 
            });

    try {
        const currencyid = await createCurrency(applicationId, signSymbol, shortName, longName, grouping, decimalCount, volume);
        return res.status(200).json({
            message: 'Currency created!',
            refrence: currencyid
        });
    } catch (e) {
        logger.error(e);
        return res.status(500).json({});
    }
});

currency_route.post('/:uuid/grant/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    const tokend: TokenData | undefined = res.locals.tokenData;
    const currencyAddress: string = req.params.uuid;
    const message: string | undefined = req.body.message;
    const creditor: string | undefined = req.body.creditor;
    const ammount: number | undefined = req.body.amount;

    logger.info('Processing request to issue grant');

    if (tokend == undefined)
        return res.status(401).json({ message: 'No authentication provided!' });
    if (ammount == undefined)
        return res.status(400).json({ message: 'No ammount variable provided!' });
    else if (ammount < 0)
        return res.status(400).json({ message: 'Negative grants not allowed!' });
    if (creditor == undefined)
        return res.status(400).json({ message: 'No creditor defined' });

    const allowed = await canMakeGrantForCurrency(tokend, currencyAddress);

    if (!allowed) 
        return res.status(401).json({ message: 'You are not authorised to issue a grant!' });

    issueGrant(creditor, currencyAddress, ammount, message).then(reply => {
        if (reply.success) {
            return res.send(200).json({message: reply.message, ref: reply.ref});
        } else if (!reply.success && (reply.error == null || reply.error == undefined)) {
            return res.status(500).json({message: reply.message});
        } else {
            return res.status(500).json({message: reply.message, errorRef: 'ndef'});
        }
    });
});

// Export the app :D
export default currency_route;