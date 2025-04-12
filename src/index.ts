// Imports
import Express from 'express';
import { SessionTrackingMiddlewear } from './middlewear/sessions';
import api_route from './routes';
import { IdentityExtractionMiddlewear } from './middlewear/identity';
import { apiExtension } from './express-api-response';

// Create application
const app = Express();
app.use(apiExtension);

// Validate their identity
app.use(IdentityExtractionMiddlewear);
app.use(SessionTrackingMiddlewear);

// Connect our routes
app.use('/api/', api_route);

// Serve static content, unless disabled
app.use(Express.static('./public'));

function start(callback: (app: Express.Application) => void) {
    app.listen(process.env.PORT || 3030, () => {
        callback(app);
    });
}

start(() => {
    console.log('Application online!');
});