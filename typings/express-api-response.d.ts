declare namespace Express {
    type APIResponseFormat = { status: boolean, code?: number, subcode?: number, message?: string, ref?: string, result?: unknown };
    export interface Response {
        sendAPIResponse(cfg: APIResponseFormat);
    }
}