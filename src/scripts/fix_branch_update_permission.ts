
import mongoose from 'mongoose';
import { Config } from '../config';
import { Permission, Role, RoleCode, RolePermission } from '../models';

const fixBranchPermission = async () => {
    try {
        await mongoose.connect(Config.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check/Create Permission
        const permCode = 'BRANCH.UPDATE';
        let permission = await Permission.findOne({ permissionCode: permCode });

        if (!permission) {
            console.log(`Permission ${permCode} not found. Creating...`);
            permission = await Permission.create({
                permissionCode: permCode,
                moduleName: 'Branch'
            });
            console.log('Permission created:', permission._id);
        } else {
            console.log(`Permission ${permCode} already exists:`, permission._id);
        }

        // 2. Assign to SA
        const saRole = await Role.findOne({ roleCode: RoleCode.SA });
        if (!saRole) throw new Error('SA Role not found');

        const exists = await RolePermission.findOne({
            roleId: saRole._id,
            permissionId: permission._id
        });

        if (!exists) {
            await RolePermission.create({
                roleId: saRole._id,
                permissionId: permission._id
            });
            console.log(`✅ Assigned ${permCode} to SA Role`);
        } else {
            console.log(`ℹ️ SA Role already has ${permCode}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

fixBranchPermission();
