import { Request, Response, NextFunction } from 'express';

type APIResponseFormat = { status: boolean, code?: number, subcode?: number, message?: string, ref?: string, result?: unknown };

export function apiExtension(req: Request, res: Response, next: NextFunction) {
    res.sendAPIResponse = function(cfg: APIResponseFormat) {
        const code = 
            (cfg.code == undefined) ? 
                (cfg.status ? 200 : 500) 
                : cfg.code;
        
        res.status(code).json(cfg);
    };
    next();
}