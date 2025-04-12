import { GetResult } from '@prisma/client/runtime';
import { isnull, validateParameter } from './general';
import { TokenData } from './identity';
import { Entitlement, EntitlementClass, EntitlementFlags, EntitlementMode, EntitlementRole, PrismaClient, Token } from '@prisma/client';

// Get database connection
const dbcon = new PrismaClient();

const GLOBAL_USERASSIGNED_PRIORITY = 5;
const GLOBAL_EVERYONE_PRIORITY = 10;

type TokenT = string | TokenData;

function tokenFlatten(t: TokenT) : string {
    if (typeof(t) == 'string')
        return t;
    return t.publicKey;
}

async function tokenFlattenToToken(t: TokenT) : Promise<Token | undefined> {
    const a = (await dbcon.token.findUnique({ where: { identity: (
        (typeof(t) == 'string') ? t : t.publicKey
    ) } }));
    return (a == null) ? undefined : a;
}

async function tokenFlattenToUserId(t: TokenT) : Promise<string | undefined> {
    if (typeof(t) == 'string') {
        const a = (await dbcon.token.findUnique({ where: { identity: t } }))?.userId;
        return (a == null) ? undefined : a;
    } else {
        return t.userId;
    }
}

type er = {
    priority: number,
    entitlements: Entitlement[]
};

type EntitlementEntry = {
    priority: number,
    class: EntitlementClass,
    given: boolean
}

async function getGlobalEveryoneRoles() {
    return await dbcon.entitlementRole.findMany({
        where: { flags: { hasEvery: ['Global', 'EveryoneRole'] } },
        include: { Entitlements: true }
    });
}

type qt1 = EntitlementRole & { Entitlements: Entitlement[] };
type qt2 = Promise<qt1[]>;

async function promiseify<T>(v: T) : Promise<T> {
    return v;
}

async function extractEntitlements(fx: qt2) : Promise<EntitlementEntry[]> {
    const r: EntitlementEntry[] = [];
    (await fx).forEach(row => {
        row.Entitlements.forEach(e => {
            r.push({ 
                priority: row.priority, 
                class: e.class, 
                given: (e.mode == EntitlementMode.Grant) 
            });
        });
    });
    return r;
}

async function combindEntitlementSet(fxSet: qt2[]) : Promise<EntitlementEntry[]> {
    const results = await Promise.allSettled(fxSet.map(async fx => await extractEntitlements(fx)));
    const fulfilledResults = results
        .filter((pr): pr is PromiseFulfilledResult<EntitlementEntry[]> => pr.status === 'fulfilled')
        .map(pr => pr.value);
    return fulfilledResults.flat();
}

function checkEntitlementSetFor(set: EntitlementEntry[], entitlementType: EntitlementClass) : {priority: number, entitled: boolean} {
    return set.reduce((acc: {entitled: boolean, priority: number}, v: EntitlementEntry) => {
        return (v.class == entitlementType && v.priority < acc.priority) ?
            {entitled: v.given, priority: v.priority} : acc;
    }, {entitled: false, priority: Infinity});
}

function getUserAssignedGlobalEntitlements(userId: string) {
    return dbcon.entitlementRole.findMany({
        where: { 
            flags: { hasEvery: ['Global', 'UserAssigned'] },
            Memberships: { some: { userId: userId }}
        },
        include: { Entitlements: true, Memberships: true }
    });
}

function getUsersRolesFromGroup(userId: string, groupId: string) {
    return dbcon.entitlementRole.findMany({
        where: { 
            flags: { hasEvery: ['Group'] },
            Memberships: { some: { userId: userId }},
            UsedInGroups: { some: { id: groupId } }
        },
        include: { Entitlements: true, Memberships: true }
    });
}

export async function canGetPublicAssetList(actor?: TokenT) : Promise<boolean> {
    const userId: string = (await tokenFlattenToUserId(actor!))!;
    return checkEntitlementSetFor(
        await combindEntitlementSet([getGlobalEveryoneRoles(), getUserAssignedGlobalEntitlements(userId)]), 
        EntitlementClass.CURRENCY_LIST
    ).entitled;
}

export async function canMakeCurrencyForApplication(actor: TokenT, applicationID: string): Promise<boolean> {
    if (actor == '@me') throw new Error();
    const tokend = validateParameter<Token>(await tokenFlattenToToken(actor), 'Invalid token!');

    return checkEntitlementSetFor(
        await combindEntitlementSet([getUsersRolesFromGroup(tokend.userId!, applicationID)]),
        EntitlementClass.CURRENCY_CREATE
    ).entitled;
}

export async function canMakeWalletForCurrency(actor: TokenT, currencyID: string): Promise<boolean> {
    /*
        1. Get the AssetType's @everyone rules
        2. Check if the Actor is apart of the app that owns the token
        2a. If so, get any roles that apply to them within that group
        3. Evaluate policy
    */

    try {
        return true;
    } catch(e) {
        return false;
    }
    return false;
}

export async function canMakeGrantForCurrency(actor: TokenT, currencyID: string): Promise<boolean> {
    try {
        if (typeof(actor) != 'string') 
            actor = (actor as TokenData).publicKey;
        const tokend = await dbcon.token.findFirst({ where: {identity: actor} });
        const currencyd = await dbcon.currency.findFirst({ where: {id: currencyID} });

        return (tokend?.applicationId == currencyd?.ownerId);
    } catch(e) {
        return false;
    }
    return false;
}

export async function canUserLogin(userID: string): Promise<boolean> {
    try {
        const userEntry = await dbcon.userAccount.findUnique({
            where: { id: userID }
        });
        if (isnull(userEntry)) return false;
        return userEntry!.canLogin;
    } catch(e) {
        return false;
    }
}

export async function canCreateApplicationFor(actor: TokenT, targetUser: string): Promise<boolean> {
    return false;
}

export async function canStartTransactionFor(actor: TokenT, targetAccount: string): Promise<boolean> {
    try {
        if (typeof(actor) != 'string') 
            actor = (actor as TokenData).publicKey;
        const tokend = await dbcon.token.findFirst({ where: {identity: actor} });

        return (tokend?.userId == targetAccount);
    } catch(e) {
        return false;
    }
    return false;
}