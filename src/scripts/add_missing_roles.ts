import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB, disconnectDB } from '../config/database';
import { Role, RoleCode } from '../models';

const migrate = async () => {
    console.log('🌱 Adding Missing Roles...');
    await connectDB();

    try {
        const rolesToCreate = [
            { roleCode: RoleCode.PE, roleName: 'Purchase Executive' },
            { roleCode: RoleCode.SM, roleName: 'Store Manager' },
            { roleCode: RoleCode.IR, roleName: 'Indent Requester' },
        ];

        for (const roleData of rolesToCreate) {
            const exists = await Role.findOne({ roleCode: roleData.roleCode });
            if (!exists) {
                await Role.create(roleData);
                console.log(`✅ Created ${roleData.roleName} (${roleData.roleCode})`);
            } else {
                console.log(`ℹ️ role ${roleData.roleCode} already exists.`);
            }
        }

        console.log('\n✅ Migration Complete!');
    } catch (error) {
        console.error('❌ Migration Failed:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

migrate();
