/*

    Note on role priorities:
        Any UGC role MUST be priority 100 OR GREATER.

        [000:010] System roles
        [030:039] are used for platform-wide roles.
        [040:049] 40-49 are used for the group-specific system roles.
        [100:199] User-created group roles.
        [200:200] Roles assigned directly to a group member.

*/

export const EntitlementPriorityOffsets = {
    ['system']: 0,
    ['platform']: 30,
    ['systemGroup']: 40,
    ['userGroup']: 100,
    ['userGUser']: 200
};

export enum EntitlementMembershipLevel {
    User,
    Member,
    Admin,
    Owner
}

