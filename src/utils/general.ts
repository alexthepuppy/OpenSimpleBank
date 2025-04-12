import { MissingRequiredParameterError } from './errors';
import { getUserApplicationId, TokenData } from './identity';

export function isnull<T>(value: T) {
    return (value == null || value == undefined);
}

export function assert<T>(value: T, message?: string): T {
    if (isnull(value)) throw new Error(message);
    return value;
}

export function safelyAssert<T>(value: T, defval: T): T {
    if (isnull(value)) return defval;
    return value;
}

export function ifndef<T>(value: T, callback: () => void) : T | void {
    if (isnull(value)) return callback();
    return value;
}

export function defaultsTo<T>(value: T, defval: T): T {
    if (isnull(value)) return defval;
    return value;
}

export function caster<D>(input: unknown) : D {
    return (input as D);
}

export type ResponseFormat = { status: boolean, code?: number, subcode?: number, message?: string, ref?: string, result?: unknown };
export function formatResponse(config: ResponseFormat) : ResponseFormat {
    return config;
}

type validatorFunction = (param: unknown) => boolean;
export function validateParameter<T>(param: unknown, failMessage?: string, key?: string, validatorFunction: validatorFunction = isnull) : T {
    if (validatorFunction(param)) {
        return param as T;
    }
    throw new MissingRequiredParameterError(key, param);
}

export async function meResolver(applicationId: string, identity?: TokenData) : Promise<string | undefined> {
    if (applicationId == '@me') {
        if (identity == undefined || identity?.userId == undefined)
            return undefined;
        return await getUserApplicationId(identity.userId!);
    }
    return applicationId;
}