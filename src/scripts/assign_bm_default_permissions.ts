import dns from 'dns';
import { connectDB, disconnectDB } from '../config/database';
import { Role, RoleCode, Permission, RolePermission } from '../models';

dns.setServers(['8.8.8.8', '8.8.4.4']);

// Define permissions for each role based on App_flow.md
const rolePermissions: Record<RoleCode, string[]> = {
    [RoleCode.SA]: [
        // SA gets all permissions
        'USER.CREATE', 'USER.VIEW', 'USER.UPDATE', 'USER.DELETE',
        'VENDOR.CREATE', 'VENDOR.VIEW', 'VENDOR.UPDATE', 'VENDOR.DELETE',
        'ITEM.CREATE', 'ITEM.VIEW', 'ITEM.UPDATE', 'ITEM.DELETE',
        'PO.CREATE', 'PO.VIEW', 'PO.UPDATE', 'PO.APPROVE',
        'CATEGORY.CREATE', 'CATEGORY.VIEW',
        'GRN.CREATE',
        'INDENT.CREATE', 'INDENT.APPROVE', 'INDENT.ISSUE',
        'LOGS.VIEW',
        'BRANCH.CREATE', 'BRANCH.VIEW', 'BRANCH.UPDATE',
    ],
    [RoleCode.BM]: [
        // Branch Manager: Approve PO, View/Manage most things
        'USER.CREATE', 'USER.VIEW', 'USER.UPDATE', 'USER.DELETE',
        'VENDOR.VIEW', 'VENDOR.UPDATE',
        'ITEM.VIEW', 'ITEM.UPDATE',
        'PO.VIEW', 'PO.UPDATE', 'PO.APPROVE',
        'CATEGORY.VIEW',
        'GRN.CREATE',
        'INDENT.APPROVE', 'INDENT.ISSUE',
        'LOGS.VIEW',
        'BRANCH.VIEW', 'BRANCH.UPDATE',
    ],
    [RoleCode.PE]: [
        // Purchase Executive: Create PO, View Vendor/Reports
        'VENDOR.VIEW',
        'ITEM.VIEW',
        'PO.CREATE', 'PO.VIEW', 'PO.UPDATE',
        'CATEGORY.VIEW',
        'GRN.CREATE',
        'LOGS.VIEW',
    ],
    [RoleCode.SM]: [
        // Store Manager: View Inventory, Create GRN, Issue Indent
        'ITEM.VIEW',
        'GRN.CREATE',
        'INDENT.ISSUE',
        'LOGS.VIEW',
    ],
    [RoleCode.IR]: [
        // Indent Requester: Create Indent only
        'INDENT.CREATE',
        'LOGS.VIEW',
    ],
};

async function assignRolePermissions() {
    console.log('🚀 Assigning default permissions to all roles...');
    await connectDB();

    try {
        // Get all permissions
        const allPermissions = await Permission.find({});
        console.log(`✅ Found ${allPermissions.length} permissions\n`);

        // Process each role
        for (const [roleCode, permissionCodes] of Object.entries(rolePermissions)) {
            const role = await Role.findOne({ roleCode: roleCode as RoleCode });
            if (!role) {
                console.warn(`⚠️  Role ${roleCode} not found, skipping...`);
                continue;
            }

            console.log(`\n📋 Processing ${role.roleName} (${roleCode})...`);

            // Get existing permissions
            const existingPermissions = await RolePermission.find({ roleId: role._id });
            const existingPermissionIds = existingPermissions.map(rp => rp.permissionId.toString());
            console.log(`   ℹ️  Already has ${existingPermissionIds.length} permissions`);

            let assignedCount = 0;
            for (const permCode of permissionCodes) {
                const permission = allPermissions.find(p => p.permissionCode === permCode);
                if (!permission) {
                    console.warn(`   ⚠️  Permission ${permCode} not found, skipping...`);
                    continue;
                }

                // Check if already assigned
                if (existingPermissionIds.includes(permission._id.toString())) {
                    continue; // Skip if already assigned
                }

                // Assign permission
                await RolePermission.create({
                    roleId: role._id,
                    permissionId: permission._id,
                });
                assignedCount++;
                console.log(`   ✅ Assigned ${permCode}`);
            }

            const totalPermissions = existingPermissionIds.length + assignedCount;
            console.log(`   📊 Total permissions: ${totalPermissions} (${assignedCount} newly assigned)`);
        }

        console.log(`\n✅ Successfully assigned permissions to all roles!`);

    } catch (error) {
        console.error('❌ Failed to assign permissions:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

assignRolePermissions();
