
import { connectDB, disconnectDB } from '../config/database';
import { Role, Permission, RolePermission } from '../models';

async function addPermissions() {
    console.log('🚀 Adding Missing Permissions...');
    try {
        await connectDB();

        const permissionsToAdd = [
            { code: 'PO.VIEW', module: 'Purchase Order' }
        ];

        for (const p of permissionsToAdd) {
            let perm = await Permission.findOne({ permissionCode: p.code });
            if (!perm) {
                perm = await Permission.create({
                    permissionCode: p.code,
                    moduleName: p.module
                });
                console.log(`✅ Created Permission: ${p.code}`);
            } else {
                console.log(`ℹ️ Permission ${p.code} already exists.`);
            }

            // Assign to SA and BM
            const roles = await Role.find({ roleCode: { $in: ['SA', 'BM'] } });
            for (const role of roles) {
                const exists = await RolePermission.findOne({ roleId: role._id, permissionId: perm._id });
                if (!exists) {
                    await RolePermission.create({
                        roleId: role._id,
                        permissionId: perm._id
                    });
                    console.log(`+ Assigned ${p.code} to ${role.roleCode}`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Failed:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

addPermissions();
