import { Router } from 'express';
import api_v1 from './v1';

const api_route = Router();

api_route.use('/v1/', api_v1);

export default api_route;