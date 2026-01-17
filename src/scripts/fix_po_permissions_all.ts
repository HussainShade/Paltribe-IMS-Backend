
import mongoose from 'mongoose';
import { Config } from '../config';
import { Permission, Role, RoleCode, RolePermission } from '../models';

const fixPOPermissionsAll = async () => {
    try {
        await mongoose.connect(Config.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Permissions to check/create
        const permissions = [
            { code: 'PO.CREATE', module: 'PurchaseOrder' },
            { code: 'PO.UPDATE', module: 'PurchaseOrder' }
        ];

        // Roles to assign to
        const roleCodes = [RoleCode.SA, RoleCode.BM, RoleCode.PE];

        for (const p of permissions) {
            // 1. Ensure Permission Exists
            let permission = await Permission.findOne({ permissionCode: p.code });
            if (!permission) {
                console.log(`Permission ${p.code} not found. Creating...`);
                permission = await Permission.create({
                    permissionCode: p.code,
                    moduleName: p.module
                });
                console.log(`✅ Created Permission: ${p.code}`);
            } else {
                console.log(`ℹ️  Permission ${p.code} exists.`);
            }

            // 2. Assign to Roles
            for (const rCode of roleCodes) {
                const role = await Role.findOne({ roleCode: rCode });
                if (!role) {
                    // Role might not exist (e.g. PE might not be created yet)
                    console.log(`⚠️ Role ${rCode} not found in DB. Skipping assignment.`);
                    continue;
                }

                const exists = await RolePermission.findOne({
                    roleId: role._id,
                    permissionId: permission._id
                });

                if (!exists) {
                    await RolePermission.create({
                        roleId: role._id,
                        permissionId: permission._id
                    });
                    console.log(`✅ Assigned ${p.code} to ${rCode}`);
                } else {
                    console.log(`ℹ️  ${rCode} already has ${p.code}`);
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

fixPOPermissionsAll();
