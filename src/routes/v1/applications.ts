// Imports
import { Router } from 'express';
import { canCreateApplicationFor } from '../../utils/permissions';
import winston from 'winston';
import { TokenData } from '../../utils/identity';
import { createOwnedApplication } from '../../utils/applications';
import { IdentityRequirementMiddlewear } from '../../middlewear/identity';
import { UnauthorisedError } from '../../utils/errors';


// Create our apps
const application_route = Router();

// Create an application!
application_route.post('/', IdentityRequirementMiddlewear, async (req, res) => {
    const logger: winston.Logger = res.locals.log;
    const tokend: TokenData = res.locals.tokenData;

    const displayName: string | undefined = req.body.displayName;
    const description: string | undefined = req.body.description;
    const iconUri: string | undefined = req.body.iconUri;
    let userTargetId: string | undefined = req.body.userid;

    logger.info('Received request to create application');

    if (userTargetId == '@me')
        userTargetId = tokend.userId;

    if (userTargetId == undefined)
        return res.sendAPIResponse({
            status: false,
            code: 400,
            message: 'Target user not specified.'
        });

    const allowed = await canCreateApplicationFor(tokend.publicKey, userTargetId);

    if (allowed) {
        logger.info('Attempting to create application record');
            
        const app = await createOwnedApplication(
            displayName ?? 'Application',
            userTargetId,
            description,
            iconUri,
            true,
            false
        );

        logger.info('Application record created');

        return res.sendAPIResponse({
            status: true,
            message: 'Application created successfully!',
            ref: app.id
        });
    } else {
        logger.warn('Permission denied for actor to create application!');
        throw new UnauthorisedError(
            'You are not allowed to create an application for the user!',
            { targetUser: userTargetId }
        );
    }
});

// Export the app :D
export default application_route;