import { connectDB, disconnectDB } from '../config/database';
import mongoose from 'mongoose';
import { User, UserPermissionOverride } from '../models';

/**
 * Migration: Move legacy per-user branch permission overrides stored in User.branches[].permissions
 * into the scalable UserPermissionOverride collection.
 *
 * This supports old data where permissions may exist as:
 * - Map (older schema)
 * - plain object (after Mixed/object change)
 *
 * After writing overrides, this script optionally removes branches[].permissions to avoid confusion.
 */
async function migrate() {
  console.log('🚀 Migrating User.branches[].permissions -> UserPermissionOverride collection');
  await connectDB();

  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    let upserted = 0;
    let cleaned = 0;

    for (const u of users) {
      const tenantId = (u as any).tenantId;
      const userId = (u as any)._id;
      let modified = false;

      const branches: any[] = Array.isArray((u as any).branches) ? (u as any).branches : [];

      for (const b of branches) {
        const branchId = b.branchId;
        if (!branchId) continue;

        const permsRaw = b.permissions;
        if (!permsRaw) continue;

        // Normalize to plain object
        let permsObj: Record<string, boolean> = {};
        if (permsRaw instanceof Map) {
          permsObj = Object.fromEntries(permsRaw as Map<string, boolean>);
        } else if (typeof permsRaw === 'object' && permsRaw !== null) {
          permsObj = permsRaw as Record<string, boolean>;
        }

        for (const [permissionCode, allowed] of Object.entries(permsObj)) {
          await UserPermissionOverride.updateOne(
            {
              tenantId,
              userId,
              branchId,
              permissionCode,
            },
            {
              $set: { allowed: !!allowed },
            },
            { upsert: true }
          );
          upserted++;
        }

        // Remove legacy permissions field after migration (optional but recommended)
        if (b.permissions) {
          delete b.permissions;
          modified = true;
        }
      }

      if (modified) {
        await (u as any).save();
        cleaned++;
        console.log(`✅ Migrated user ${(u as any)._id.toString()} (${(u as any).email})`);
      }
    }

    console.log(`🎉 Migration complete. Overrides upserted: ${upserted}, users cleaned: ${cleaned}`);
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

migrate();

