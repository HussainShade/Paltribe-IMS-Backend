import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '8.8.4.4']);
import { connectDB, disconnectDB } from '../config/database';
import {
    Tenant, TenantStatus,
    Role, RoleCode,
    Permission,
    RolePermission,
    User, UserStatus,
    Branch, BranchStatus
} from '../models';

const seed = async () => {
    console.log('🌱 Starting Fresh Seed...');
    await connectDB();

    try {
        // 1. Clean Database (Truncate all collections)
        console.log('🧹 Cleaning all existing collections...');
        const collections = await mongoose.connection.db?.collections();
        if (collections) {
            for (const collection of collections) {
                console.log(`   - Clearing: ${collection.collectionName}`);
                await collection.deleteMany({});
            }
        }

        // 2. Create Tenant
        console.log('🏢 Creating Tenant...');
        const generateTenantId = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const tenantId = generateTenantId();
        const tenant = await Tenant.create({
            _id: tenantId,
            tenantName: 'Hipalz Enterprise',
            status: TenantStatus.ACTIVE,
        });

        // 3. Create Headquarters Branch
        console.log('🏢 Creating Headquarters Branch...');
        const mainBranch = await Branch.create({
            tenantId: tenant._id,
            branchName: 'Headquarters',
            location: 'Sainikpuri',
            status: BranchStatus.ACTIVE
        });

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

        await Role.create({
            roleCode: RoleCode.PE,
            roleName: 'Purchase Executive',
        });

        await Role.create({
            roleCode: RoleCode.SM,
            roleName: 'Store Manager',
        });

        await Role.create({
            roleCode: RoleCode.IR,
            roleName: 'Indent Requester',
        });

        // 5. Create Permissions
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

        // 6. Assign All Permissions to SA Role
        console.log('🔗 Linking Permissions to SA Role...');
        const saPermissions = createdPermissions.map(p => ({
            roleId: saRole._id,
            permissionId: p._id,
        }));
        await RolePermission.insertMany(saPermissions);

        // 7. Create Super Admin User
        console.log('👤 Creating Super Admin User...');
        const passwordHash = await Bun.password.hash('password123');

        const saUser = await User.create({
            tenantId: tenant._id,
            roleId: saRole._id,
            name: 'Hipalz Admin',
            email: 'admin@hipalz.com',
            passwordHash: passwordHash,
            status: UserStatus.ACTIVE,
            // Link to the Headquarters branch by default
            branchId: mainBranch._id,
            branches: [{
                branchId: mainBranch._id,
                roleId: saRole._id
            }]
        });

        console.log('\n✅ Database Seeded Successfully!');
        console.log('-------------------------------------------');
        console.log('� SYSTEM DETAILS:');
        console.log(`   Tenant ID:      ${tenant._id}`);
        console.log(`   Tenant Name:    ${tenant.tenantName}`);
        console.log('-------------------------------------------');
        console.log('🏢 BRANCH DETAILS:');
        console.log(`   Branch Name:    ${mainBranch.branchName}`);
        console.log(`   Branch ID:      ${mainBranch._id}`);
        console.log('-------------------------------------------');
        console.log('👤 USER DETAILS:');
        console.log(`   Name:           ${saUser.name}`);
        console.log(`   Email:          ${saUser.email}`);
        console.log(`   Password:       password123`);
        console.log(`   Role:           Super Admin`);
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

seed();
