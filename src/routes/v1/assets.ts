// Imports
import { Router } from 'express';
import { createAssetType, getListOfAssets, issueAsset } from '../../utils/assets';
import { canGetPublicAssetList, canMakeCurrencyForApplication, canMakeGrantForCurrency } from '../../utils/permissions';
import { TokenData } from '../../utils/identity';
import winston from 'winston';
import { caster, defaultsTo, isnull, meResolver, validateParameter } from '../../utils/general';
import { UnauthorisedError } from '../../utils/errors';
import { IdentityRequirementMiddlewear } from '../../middlewear/identity';

// Create our apps
const assets_route = Router();

assets_route.get('/', async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    const tokend: TokenData | undefined = res.locals.tokenData;
    logger.info('Processing asset list request');

    if (await canGetPublicAssetList(tokend)) {
        const assetList = await getListOfAssets();
        logger.debug(`Assets: ${JSON.stringify(assetList)}`);
        return res.sendAPIResponse({
            status: true,
            code: 200,
            message: 'Assets fetches successfuly',
            result: assetList
        });
    } else {
        throw new UnauthorisedError();
    }
});

assets_route.use(IdentityRequirementMiddlewear);

/*
    @route POST /api/v1/assets/
    @authentication required
    @param symbol string The assets stymbol
    @param grouping number The command seperation count
    @param decimals number How many decimal figures are there
    @param shortName string The short name of the asset type
    @param longName string The long name of the asset type
    @param maxVolume number The maximum that can be made

    @reply status Number The response code
    @reply message String The response message
    @reply refrence String? The ID of the asset created, if successful, or the appId if failed

    Route to create a new asset type
*/
assets_route.post('/', async (req, res) => {
    // Extract common data
    const logger: winston.Logger = res.locals.log;
    const tokend: TokenData = res.locals.tokenData;
    logger.info('Processing asset type creation request');
    
    // Extract request data
    const requestParams = {
        signSymbol: validateParameter<string>(req.body.symbol, 'Missing symbol sign'),
        grouping: defaultsTo<number>(req.body.grouping, 3),
        decimalCount: defaultsTo<number>(req.body.decimals, 3),
        shortName: validateParameter<string>(req.body.shortName, 'Missing short name'),
        longName: validateParameter<string>(req.body.longName, 'Missing long name'),
        maxVolume: caster<number | undefined>(req.body.maxVolume)
    };
    logger.debug(`Parameters: ${JSON.stringify(requestParams)}`);

    // Resolve application ID
    const applicationId: string = validateParameter<string>(await meResolver(req.body.application_id), 'Missing applicationId');
    logger.debug(`ApplicationId resolved to (${applicationId})`);

    // Validate entitlements
    const allowed = await canMakeCurrencyForApplication(tokend.publicKey, applicationId);
    logger.info(`Authorization is ${allowed ? '' : 'not'} granted`);

    if (allowed) {
        const currencyid = await createAssetType(
            applicationId, 
            requestParams.signSymbol, 
            requestParams.shortName, 
            requestParams.longName, 
            requestParams.grouping, 
            requestParams.decimalCount, 
            requestParams.maxVolume
        );
        logger.info(`New AssetType created with ID (${currencyid})`);
        return res.sendAPIResponse({
            status: true,
            message: 'AssetType successfully created!',
            ref: currencyid
        });
    } else {
        throw new UnauthorisedError('You are not authorised to create assets for that application!');
    }
});

/*
    @route POST /api/v1/assets/:uuid/grant/
    @authentication required
    @param uuid string The UUID of the asset type
    @param message string? The message on the transaction
    @param creditor string Who the asset should be given to
    @param amount number The volume of assets to issue
*/
assets_route.post('/:uuid/grant/', async (req, res) => {
    // Extract common data
    const logger: winston.Logger = res.locals.log;
    const tokend: TokenData = res.locals.tokenData;

    // Request data
    const currencyAddress: string = req.params.uuid;
    const message: string | undefined = req.body.message;
    const creditor: string = validateParameter<string>(req.body.creditor, 'Creditor parameter incorrect');
    const ammount = validateParameter<number>(req.body.amount, 'Value parameter incorrect', 'value', (val) => {
        if (isnull(val))
            return false;
        if (ammount < 0)
            return false;
        return true;
    });

    logger.info('Processing request to issue grant');

    if (await canMakeGrantForCurrency(tokend, currencyAddress)) {
        const response = await issueAsset(creditor, currencyAddress, ammount, message);
        logger.info(`Grant issuing was ${response.success ? '' : 'not'} successful`);

        if (response.success) {
            return res.sendAPIResponse({
                status: true, 
                message: response.message, 
                ref: response.ref
            });
        } else if (!response.success && (response.error == null || response.error == undefined)) {
            return res.sendAPIResponse({status: false, code: 500, message: response.message});
        } else {
            return res.sendAPIResponse({status: false, code: 500, message: response.message});
        }
    } else {
        return res.sendAPIResponse({
            status: false,
            code: 401,
            message: 'You are not authorised to issue a grant!'
        });
    }

});

// Export the app :D
export default assets_route;