// Imports
import { PrismaClient, TransactionStatus } from '@prisma/client';
// Get database connection
const dbcon = new PrismaClient();

export async function getListOfCurrencies() {
    const list = await dbcon.currency.findMany({
        select: {
            id: true,
            ownerId: false,
            currencySign: true,
            longName: true,
            shortName: true,
            volume: true,
            liquidity: true,
            public: true,
            Owner: {
                select: {
                    displayName: true,
                    id: true,
                }
            }
        }
    });
    return list;
}

export async function createCurrency(applicationId: string, symbol: string, shortName: string, longName: string, grouping: number = 3, decimals: number = 0, volume?: number) : Promise<string> {
    // console.log(`Creating currency for application (${applicationId})`);
    const currency = await dbcon.currency.create({data:{
        ownerId: applicationId,
        currencySign: symbol,
        groupingSize: grouping,
        decimalCount: decimals,
        shortName: shortName,
        longName: longName,
        volume: volume,
        liquidity: 0
    }});

    return currency.id;
}

export async function issueGrant(
    creditorId: string, 
    currencyId: string, 
    value: number, 
    message?: string
) : Promise<{ success: boolean, message: string, ref?: string, error?: unknown}> {
    // Validate the wallet can receice grants from this currency
    const target_wallet = await dbcon.wallet.findFirst({ where: { id: creditorId } });
    const source_currency = await dbcon.currency.findFirst({ where: { id: currencyId } });

    if (target_wallet == undefined)
        return {success: false, message: 'Target wallet does not exist!'};
    if (source_currency == undefined)
        return {success: false, message: 'Source currency does not exist!'};
    if (target_wallet.currencyId != source_currency.id)
        return {success: false, message: 'Currency ID mismatch!'};
    if (source_currency.liquidity + value > source_currency.volume)
        return {success: false, message: 'Grant would exceed currency volume limits'};

    try {
        const [transaction] = await dbcon.$transaction([
            dbcon.transaction.create({data:{
                creditorId: creditorId,
                value: value,
                status: TransactionStatus.PROCESSED,
                debtorHeadline: message ?? 'Grant issued',
                debtorDescription: message
            }}),
            dbcon.wallet.update({
                where: {id: creditorId},
                data: {balance: {increment: value}}
            }),
            dbcon.currency.update({
                where: { id: currencyId },
                data: { liquidity: {increment: value} }
            })
        ]);

        return {success: true, message: 'Grant created!', ref: transaction.id};
    } catch(e) {
        return {success: false, message: 'Error occoured issuing grant!', error: e};
    }
}