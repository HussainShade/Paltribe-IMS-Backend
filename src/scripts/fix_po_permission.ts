
import mongoose from 'mongoose';
import { Config } from '../config';
import { Permission, Role, RoleCode, RolePermission } from '../models';

const fixPOPermission = async () => {
    try {
        await mongoose.connect(Config.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check/Create Permission
        const permCode = 'PO.UPDATE';
        let permission = await Permission.findOne({ permissionCode: permCode });

        if (!permission) {
            console.log(`Permission ${permCode} not found. Creating...`);
            permission = await Permission.create({
                permissionCode: permCode,
                moduleName: 'PurchaseOrder'
            });
            console.log('Permission created:', permission._id);
        } else {
            console.log(`Permission ${permCode} already exists:`, permission._id);
        }

        // 2. Assign to Roles (SA, BM, PE)
        const rolesToUpdate = [RoleCode.SA, RoleCode.BM, RoleCode.PE];

        for (const code of rolesToUpdate) {
            const role = await Role.findOne({ roleCode: code });
            if (!role) {
                console.log(`⚠️ Role ${code} not found, skipping assignment.`);
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
                console.log(`✅ Assigned ${permCode} to ${code}`);
            } else {
                console.log(`ℹ️  ${code} already has ${permCode}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

fixPOPermission();
