import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import {
    Tenant, TenantStatus,
    Role, RoleCode,
    Permission,
    RolePermission,
    User, UserStatus
} from '../models';

const seed = async () => {
    console.log('🌱 Starting Seed...');
    await connectDB();

    try {
        // 1. Clean Database
        console.log('🧹 Cleaning existing data...');
        await User.deleteMany({});
        await RolePermission.deleteMany({});
        await Permission.deleteMany({});
        await Role.deleteMany({});
        await Tenant.deleteMany({});

        // 2. Create Tenant
        console.log('🏢 Creating Tenant...');
        const tenant = await Tenant.create({
            tenantName: 'Demo Tenant',
            status: TenantStatus.ACTIVE,
        });


        // 3. Create Branch
        console.log('🏢 Creating Branch...');
        const mainBranch = await import('../models').then(m => m.Branch.create({
            tenantId: tenant._id,
            branchName: 'Main Branch',
            location: 'Headquarters',
            status: 'ACTIVE' // Using string manually or import enum
        }));

        // 4. Create Roles
        console.log('👑 Creating Roles...');
        const saRole = await Role.create({
            roleCode: RoleCode.SA,
            roleName: 'Super Admin',
        });

        const bmRole = await Role.create({
            roleCode: RoleCode.BM,
            roleName: 'Branch Manager',
        });

        // 4. Create Permissions
        console.log('🔒 Creating Permissions...');
        const permissionsList = [
            // User
            { code: 'USER.CREATE', module: 'User' },
            { code: 'USER.VIEW', module: 'User' },
            { code: 'USER.UPDATE', module: 'User' },
            { code: 'USER.DELETE', module: 'User' },
            // Vendor
            { code: 'VENDOR.CREATE', module: 'Vendor' },
            { code: 'VENDOR.VIEW', module: 'Vendor' },
            { code: 'VENDOR.UPDATE', module: 'Vendor' },
            { code: 'VENDOR.DELETE', module: 'Vendor' },
            // Item
            { code: 'ITEM.CREATE', module: 'Item' },
            { code: 'ITEM.VIEW', module: 'Item' },
            { code: 'ITEM.UPDATE', module: 'Item' },
            { code: 'ITEM.DELETE', module: 'Item' },
            // PO
            { code: 'PO.CREATE', module: 'PurchaseOrder' },
            { code: 'PO.UPDATE', module: 'PurchaseOrder' },
            { code: 'PO.APPROVE', module: 'PurchaseOrder' },
            // Category
            { code: 'CATEGORY.CREATE', module: 'Category' },
            { code: 'CATEGORY.VIEW', module: 'Category' },
            // GRN
            { code: 'GRN.CREATE', module: 'GRN' },
            // Indent
            { code: 'INDENT.CREATE', module: 'Indent' },
            { code: 'INDENT.APPROVE', module: 'Indent' },
            { code: 'INDENT.ISSUE', module: 'Indent' },
            // Logs
            { code: 'LOGS.VIEW', module: 'Logs' },
            // Branch
            { code: 'BRANCH.CREATE', module: 'Branch' },
            { code: 'BRANCH.VIEW', module: 'Branch' },
            { code: 'BRANCH.UPDATE', module: 'Branch' },
        ];

        const createdPermissions = await Permission.insertMany(
            permissionsList.map(p => ({
                permissionCode: p.code,
                moduleName: p.module,
            }))
        );

        // 5. Assign Permissions to Roles
        console.log('🔗 Linking Permissions to Roles...');

        // Full access for SA
        const saPermissions = createdPermissions.map(p => ({
            roleId: saRole._id,
            permissionId: p._id,
        }));
        await RolePermission.insertMany(saPermissions);

        // Limited access for BM 
        const bmPermissionCodes = [
            'USER.CREATE', 'USER.VIEW', 'USER.UPDATE', 'USER.DELETE',
            'LOGS.VIEW',
            'BRANCH.VIEW', // To see own branch details? Or selection?
            'CATEGORY.CREATE', 'CATEGORY.VIEW',
            // Inherit PE, SM, IR permissions
            'PO.CREATE', 'PO.UPDATE', 'PO.APPROVE',
            'GRN.CREATE',
            'INDENT.CREATE', 'INDENT.APPROVE', 'INDENT.ISSUE',
            'ITEM.VIEW', 'ITEM.CREATE', 'ITEM.UPDATE', 'ITEM.DELETE', // Assuming BM manages Items
            'VENDOR.VIEW', 'VENDOR.CREATE', 'VENDOR.UPDATE', 'VENDOR.DELETE'
        ];

        const bmPermissionsToAssign = createdPermissions.filter(p => bmPermissionCodes.includes(p.permissionCode));
        const bmRolePermissions = bmPermissionsToAssign.map(p => ({
            roleId: bmRole._id,
            permissionId: p._id,
        }));
        await RolePermission.insertMany(bmRolePermissions);

        // 6. Create Super Admin User
        console.log('👤 Creating Super Admin User...');
        const passwordHash = await Bun.password.hash('password123'); // Default password

        const saUser = await User.create({
            tenantId: tenant._id,
            roleId: saRole._id,
            name: 'Paltribe Admin',
            email: 'admin@paltribe.com',
            passwordHash: passwordHash,
            status: UserStatus.ACTIVE,
        });

        console.log('👤 Creating Branch Manager User...');
        const bmUser = await User.create({
            tenantId: tenant._id,
            branchId: mainBranch._id,
            roleId: bmRole._id,
            name: 'Branch Manager',
            email: 'manager@paltribe.com',
            passwordHash: passwordHash,
            status: UserStatus.ACTIVE,
        });

        console.log('\n✅ Database Seeded Successfully!');
        console.log('-------------------------------------------');
        console.log('🔑 Credentials & Roles:');
        console.log(`   Tenant ID:  ${tenant._id}`);
        console.log(`   SA Role ID: ${saRole._id}`);
        console.log(`   BM Role ID: ${bmRole._id}`);
        console.log('-------------------------------------------');
        console.log(`   Admin User: admin@paltribe.com / password123`);
        console.log(`   Manager User: manager@paltribe.com / password123`);
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

seed();
