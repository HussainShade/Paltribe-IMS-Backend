
import mongoose from 'mongoose';
import { Config } from '../config';
import { Role, RoleCode } from '../models';

const createMissingRoles = async () => {
    try {
        await mongoose.connect(Config.MONGODB_URI);
        console.log('Connected to MongoDB');

        const rolesToCreate = [
            { code: RoleCode.PE, name: 'Purchase Executive' },
            { code: RoleCode.SM, name: 'Store Manager' },
            { code: RoleCode.IR, name: 'Indent Requester' },
        ];

        console.log('--- Checking Roles ---');

        for (const r of rolesToCreate) {
            let role = await Role.findOne({ roleCode: r.code });
            if (!role) {
                console.log(`Role ${r.code} not found. Creating...`);
                role = await Role.create({
                    roleCode: r.code,
                    roleName: r.name,
                });
                console.log(`✅ Created ${r.code}: ${role._id}`);
            } else {
                console.log(`ℹ️  ${r.code} already exists: ${role._id}`);
            }
        }

        console.log('--- Done ---');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createMissingRoles();
