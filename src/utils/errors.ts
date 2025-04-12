export class InvalidLoginCredentialsError extends Error {
    constructor(username: string, password: string) {
        super(`("${username}", "${password})`);
    }
}

export class UnauthorisedError extends Error {
    public readonly extra?: object;

    constructor(message?: string, extra?: object) {
        super(message);
        this.extra = extra;
    }
}
export class CurrencyMismatchError extends Error {
    constructor(currencyA?: string, currencyB?: string) {
        super(`Mismatch between (${currencyA}) and (${currencyB})`);
    }
}
export class NoSuchWalletError extends Error {
    public readonly address?: string;

    constructor(address?: string, message?: string) {
        super(`No such wallet (${address}): ${message}`);
        this.address = address;
    }
}

export class MissingRequiredParameterError<T> extends Error {
    public readonly parameterKey?: string;
    public readonly parameterValue?: T;

    constructor(parameter?: string, value?: T) {
        super(`Missing required parameter "${parameter}"!`);
        this.parameterKey = parameter;
        this.parameterValue = value;
    }
}

export class BalanceInsufficentError extends Error {}
export class NoSuchUserError extends Error {}
export class UnknownError extends Error {}
export class NoSuchSessionError extends Error {}
export class NoSuchTokenError extends Error {}
export class InvalidTokenSecret extends Error {}
export class InvalidCredentialError extends Error {}
export class InvalidUsernameError extends InvalidCredentialError {}
export class InvalidPasswordError extends InvalidCredentialError {}