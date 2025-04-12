import { EntitlementFlags, PrismaClient } from '@prisma/client';
import { EntitlementPriorityOffsets } from './entitlements';

// Get database connection
const dbcon = new PrismaClient();

export async function createApplication(name: string, desc?: string, icon_uri?: string, visible: boolean = true, internal: boolean = true) {
    return await dbcon.application.create({
        data: {
            displayName: name,
            isPublic: visible,
            isInternal: internal,
            description: desc,
            icon_uri: icon_uri,
            EntitlementGroup: {
                create: { internal: false, hidden: false }
            }
        }
    });
}

export async function createOwnedApplication(name: string, ownerId: string, desc?: string, icon_uri?: string, visible: boolean = true, internal: boolean = true) {
    const application = await createApplication(name, desc, icon_uri, visible, internal);
    await addOwnerToApp(ownerId, application.id);
    return application;
}

export async function createUserDefaultApplication() {
    const application = await dbcon.application.create({
        data: {
            displayName: 'User Application',
            isPublic: false,
            isInternal: true,
            EntitlementGroup: {
                create: { internal: false, hidden: false }
            }
        }
    });


    return application;
}

async function addUserToApp(userId: string, applicationId: string) {
    const account = await dbcon.userAccount.findUnique({ where: { id: userId } });
    const application = await dbcon.application.findUnique({ where: { id: applicationId } });

    if (account == null || application == null)
        return new Error('Missing arguments!');

    return await dbcon.applicationMembership.create({
        data: {
            accountId: userId,
            applicationId: applicationId
        }
    });
}

export async function addMemberToApp(userId: string, applicationId: string) {
    addUserToApp(userId, applicationId);

    const member_role = await dbcon.application.findFirst({
        where: {id: applicationId},
        select: {
            EntitlementGroup: {
                select: {
                    Roles: {
                        where: { flags: { hasEvery: [EntitlementFlags.Group, EntitlementFlags.MemberRole] } }
                    }
                }
            }
        }
    });
    const member_role_id = member_role!.EntitlementGroup.Roles[0].id;
    await dbcon.entitlementRoleMembership.create({
        data: {
            roleId: member_role_id,
            userId: userId
        }
    });
}

export async function addAdminToApp(userId: string, applicationId: string) {
    addMemberToApp(userId, applicationId);
    const admin_role = await dbcon.application.findFirst({
        where: {id: applicationId},
        select: {
            EntitlementGroup: {
                select: {
                    Roles: {
                        where: { flags: { hasEvery: [EntitlementFlags.Group, EntitlementFlags.AdminRole] } }
                    }
                }
            }
        }
    });
    const admin_role_id = admin_role!.EntitlementGroup.Roles[0].id;
    await dbcon.entitlementRoleMembership.create({
        data: {
            roleId: admin_role_id,
            userId: userId
        }
    });
}

export async function addOwnerToApp(userId: string, applicationId: string) {
    addAdminToApp(userId, applicationId);
    const owner_role = await dbcon.application.findFirst({
        where: {id: applicationId},
        select: {
            EntitlementGroup: {
                select: {
                    Roles: {
                        where: { flags: { hasEvery: [EntitlementFlags.Group, EntitlementFlags.OwnerRole] } }
                    }
                }
            }
        }
    });
    const owner_role_id = owner_role!.EntitlementGroup.Roles[0].id;
    await dbcon.entitlementRoleMembership.create({
        data: {
            roleId: owner_role_id,
            userId: userId
        }
    });
}

async function createGroupsEveryoneRole(groupId: string) {
    return await dbcon.entitlementRole.create({ data: {
        flags: [EntitlementFlags.Group, EntitlementFlags.EveryoneRole],
        internal: true,
        hidden: false,
        name: 'everyone',
        priority: EntitlementPriorityOffsets.systemGroup + 4,
        UsedInGroups: {
            connect: {id: groupId}
        }
    }});
}

async function createGroupsUsersRole(groupId: string) {
    return await dbcon.entitlementRole.create({ data: {
        flags: [EntitlementFlags.Group, EntitlementFlags.UserRole],
        internal: true,
        hidden: false,
        name: 'users',
        priority: EntitlementPriorityOffsets.systemGroup + 3,
        UsedInGroups: {
            connect: {id: groupId}
        }
    }});
}

async function createGroupsMembersRole(groupId: string) {
    return await dbcon.entitlementRole.create({ data: {
        flags: [EntitlementFlags.Group, EntitlementFlags.MemberRole],
        internal: true,
        hidden: false,
        name: 'everyone',
        priority: EntitlementPriorityOffsets.systemGroup + 2,
        UsedInGroups: {
            connect: {id: groupId}
        }
    }});
}

async function createGroupsAdminsRole(groupId: string) {
    return await dbcon.entitlementRole.create({ data: {
        flags: [EntitlementFlags.Group, EntitlementFlags.AdminRole],
        internal: true,
        hidden: false,
        name: 'everyone',
        priority: EntitlementPriorityOffsets.systemGroup + 1,
        UsedInGroups: {
            connect: {id: groupId}
        }
    }});
}

async function createGroupsOwnersRole(groupId: string) {
    return await dbcon.entitlementRole.create({ data: {
        flags: [EntitlementFlags.Group, EntitlementFlags.OwnerRole],
        internal: true,
        hidden: false,
        name: 'everyone',
        priority: EntitlementPriorityOffsets.systemGroup,
        UsedInGroups: {
            connect: {id: groupId}
        }
    }});
}

export async function createGroupsInternalRoles(groupId: string) {
    const everyone = await createGroupsEveryoneRole(groupId);
    const users = await createGroupsUsersRole(groupId);
    const members = await createGroupsMembersRole(groupId);
    const admins = await createGroupsAdminsRole(groupId);
    const owners = await createGroupsOwnersRole(groupId);

    return {everyone: everyone.id, users: users.id, members: members.id, admins: admins.id, owners: owners.id};
}