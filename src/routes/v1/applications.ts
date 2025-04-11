// Imports
import { Router } from 'express';
// import logger from '../logger';
import { OptionalIdentificationMiddlewear } from '../../middlewear/identitygate';
// import { PrismaClient } from '@prisma/client';
import { canCreateApplicationFor } from '../../utils/permissions';
import winston from 'winston';
import { TokenData } from '../../utils/identity';
import { createOwnedApplication } from '../../utils/applications';

// Get database connection
// const dbcon = new PrismaClient();

// Create our apps
const application_route = Router();

application_route.use(OptionalIdentificationMiddlewear);

// Create an application!
application_route.post('/', async (req, res) => {
    const logger: winston.Logger = res.locals.logger;
    let userTargetId: string | undefined = req.body.userid;
    const tokend: TokenData | undefined = res.locals.tokenData;
    // const isPublic: boolean = defaultsTo(req.body.public, false);
    const displayName: string | undefined = req.body.displayName;
    const description: string | undefined = req.body.description;
    const iconUri: string | undefined = req.body.iconUri;

    logger.info('Received request to create application');

    if (tokend == undefined)
        return res.status(401).json({ message: 'You are not authenticated.' });

    if (userTargetId == '@me')
        userTargetId = tokend.userId;

    if (userTargetId == undefined)
        return res.status(400).json({ message: 'Target user not specified.' });

    const allowed = await canCreateApplicationFor(tokend.publicKey, userTargetId);

    if (allowed) {
        try {
            logger.info('Attempting to create application record');
            
            createOwnedApplication(
                displayName ?? 'Application',
                userTargetId,
                description,
                iconUri,
                true,
                false
            ).then(app => {
                logger.info('Application record created');
                return res.status(200).json({ message: 'Application created', refrence: app.id });
            });
        } catch (e) {
            logger.warn('Failed to create application');
            return res.status(500).json({ message: 'Failed to create application!' });
        }
    } else {
        logger.warn('Permission denied for actor to create application!');
        return res.status(401).json({ message: 'You are not allowed to create an application for the user!', targetUser: userTargetId });
    }
});

// Export the app :D
export default application_route;