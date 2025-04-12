// Imports
import { Router } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// Imports - Routes
import accounts_route from './accounts';
import wallets_route from './wallets';
import transaction_route from './transactions';
import assets_route from './assets';
import application_route from './applications';

// Create our apps
const api_route = Router();

// Heartbeat
api_route.get('/heartbeat', (req, res) => {
    return res.sendAPIResponse({
        status: true,
        message: 'Beat'
    });
});

// Attach middlewear
api_route.use(bodyParser.json());
api_route.use(bodyParser.urlencoded({ extended: false }));
api_route.use(cookieParser());

// Attach the routes
api_route.use('/account/', accounts_route);
api_route.use('/wallet/', wallets_route);
api_route.use('/transaction/', transaction_route);
api_route.use('/assets/', assets_route);
api_route.use('/application/', application_route);

export default api_route;