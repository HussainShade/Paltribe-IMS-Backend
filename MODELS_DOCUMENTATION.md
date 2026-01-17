# Inventory Management System - Models Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Design Principles](#architecture--design-principles)
3. [Model Structure](#model-structure)
4. [AUTH & RBAC Models](#auth--rbac-models)
5. [Purchase Module Models](#purchase-module-models)
6. [Special Order Module Models](#special-order-module-models)
7. [GRN & RTV Module Models](#grn--rtv-module-models)
8. [Inventory & Store Module Models](#inventory--store-module-models)
9. [Indent Module Models](#indent-module-models)
10. [Relationships & Data Flow](#relationships--data-flow)
11. [Indexes & Performance](#indexes--performance)
12. [Usage Examples](#usage-examples)
13. [Best Practices](#best-practices)

---

## System Overview

This is a **Multi-tenant SaaS Inventory Management System** built with:
- **Backend Framework**: Hono.js
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB
- **ORM**: Mongoose
- **Architecture**: Monorepo backend
- **Auth**: JWT (cookie-based)
- **Validation**: Zod (used later, not inside models)
- **Cache/Queue**: Redis + BullMQ
- **Deployment**: Docker + Kubernetes

### System Type
Multi-tenant SaaS Inventory Management System with Role-Based Access Control (RBAC).

### Access Control
- **SA** → SuperAdmin (full tenant access)
- **BM** → Branch Manager (branch approvals)
- **PE** → Purchase Executive (procurement execution)
- **SM** → Store Manager (inventory & stock operations)
- **IR** → Indent Requester (raise indents only)

---

## Architecture & Design Principles

### Global Schema Rules (Mandatory)

Every collection MUST include:
1. **tenantId**: `ObjectId` (indexed) - Multi-tenancy isolation
2. **branchId**: `ObjectId` (indexed, nullable where applicable) - Branch-level data
3. **createdAt / updatedAt**: Automatic timestamps via Mongoose
4. **status field**: Where relevant (ACTIVE/INACTIVE/OPEN/CLOSED/APPROVED/ISSUED)

### Naming Conventions
- **Fields**: camelCase
- **Models**: PascalCase
- **Collections**: plural (snake_case)
- **References**: Explicit refs (no implicit strings)

### Design Principles
- ✅ **Transaction-safe**: All models support Mongoose sessions
- ✅ **Lean-query friendly**: Optimized for `.lean()` queries
- ✅ **Future-proof for scale**: Proper indexing strategy
- ✅ **Soft deletes**: Status-based (NO hard deletes)
- ✅ **TypeScript strict**: All interfaces and types defined
- ✅ **Virtual IDs**: All models expose `*Id` virtuals for consistency

---

## Model Structure

### Standard Model Pattern

Every model follows this structure:

```typescript
// 1. Enums (if applicable)
export enum ModelStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// 2. TypeScript Interface
export interface IModel extends Document {
  modelId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  // ... other fields
  createdAt: Date;
  updatedAt: Date;
}

// 3. Mongoose Schema
const ModelSchema = new Schema<IModel>(
  {
    // Field definitions
  },
  {
    timestamps: true,
    collection: 'models',
  }
);

// 4. Virtual for ID
ModelSchema.virtual('modelId').get(function (this: IModel) {
  return this._id;
});

// 5. JSON transformation
ModelSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.modelId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// 6. Indexes
ModelSchema.index({ tenantId: 1, field: 1 });

// 7. Model export
export const Model: Model<IModel> = mongoose.model<IModel>('Model', ModelSchema);
```

---

## AUTH & RBAC Models

### 1. Tenant Model (`tenant.model.ts`)

**Purpose**: Root entity for multi-tenancy. Every other entity belongs to a tenant.

**Fields**:
- `tenantId` (virtual): ObjectId - Primary key
- `tenantName`: string - Unique tenant name
- `status`: TenantStatus enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `status` (single)
- `tenantName` (single)

**Collection**: `tenants`

**Usage**:
```typescript
import { Tenant, TenantStatus } from './models';

const tenant = await Tenant.create({
  tenantName: 'Acme Corp',
  status: TenantStatus.ACTIVE,
});
```

---

### 2. Branch Model (`branch.model.ts`)

**Purpose**: Branch locations within a tenant. Users can belong to specific branches.

**Fields**:
- `branchId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchName`: string - Branch name
- `location`: string - Physical location
- `status`: BranchStatus enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, status` (compound)
- `tenantId, branchName` (compound)

**Collection**: `branches`

**Relationships**:
- Belongs to: `Tenant`
- Has many: `User`, `PurchaseOrder`, `GRN`, `Indent`, etc.

---

### 3. User Model (`user.model.ts`)

**Purpose**: System users with tenant, branch, and role associations.

**Fields**:
- `userId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Nullable (SA can be null), indexed
- `roleId`: ObjectId (ref: Role) - Required, indexed
- `name`: string - User full name
- `email`: string - Unique email (lowercase, indexed)
- `passwordHash`: string - Hashed password (excluded from JSON)
- `status`: UserStatus enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, email` (compound, unique)
- `tenantId, status` (compound)
- `tenantId, branchId` (compound)
- `tenantId, roleId` (compound)

**Collection**: `users`

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `Role`
- Referenced by: `PurchaseOrder.createdBy`, `PurchaseOrder.approvedBy`, `GRN.createdBy`, etc.

**Security Note**: `passwordHash` is automatically excluded from JSON output.

---

### 4. Role Model (`role.model.ts`)

**Purpose**: Defines system roles with codes.

**Fields**:
- `roleId` (virtual): ObjectId - Primary key
- `roleCode`: RoleCode enum - Unique, indexed
  - `SA` - SuperAdmin
  - `BM` - Branch Manager
  - `PE` - Purchase Executive
  - `SM` - Store Manager
  - `IR` - Indent Requester
- `roleName`: string - Human-readable name
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `roleCode` (unique)

**Collection**: `roles`

**Usage**:
```typescript
import { Role, RoleCode } from './models';

const role = await Role.create({
  roleCode: RoleCode.SM,
  roleName: 'Store Manager',
});
```

---

### 5. Permission Model (`permission.model.ts`)

**Purpose**: Defines granular permissions (e.g., PO.CREATE, PO.APPROVE, GRN.RTV).

**Fields**:
- `permissionId` (virtual): ObjectId - Primary key
- `permissionCode`: string - Unique, uppercase, indexed (e.g., "PO.CREATE")
- `moduleName`: string - Module name (e.g., "Purchase Order")
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `permissionCode` (unique)
- `moduleName` (single)

**Collection**: `permissions`

**Usage**:
```typescript
import { Permission } from './models';

const permission = await Permission.create({
  permissionCode: 'PO.CREATE',
  moduleName: 'Purchase Order',
});
```

---

### 6. RolePermission Model (`role-permission.model.ts`)

**Purpose**: Maps roles to permissions (RBAC junction table).

**Fields**:
- `rolePermissionId` (virtual): ObjectId - Primary key
- `roleId`: ObjectId (ref: Role) - Required, indexed
- `permissionId`: ObjectId (ref: Permission) - Required, indexed
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `roleId, permissionId` (compound, unique)
- `roleId` (single)
- `permissionId` (single)

**Collection**: `role_permissions`

**Relationships**:
- Belongs to: `Role`, `Permission`

**Usage**:
```typescript
import { RolePermission } from './models';

// Assign PO.CREATE permission to PE role
await RolePermission.create({
  roleId: peRoleId,
  permissionId: poCreatePermissionId,
});
```

---

### 7. AuditLog Model (`audit-log.model.ts`)

**Purpose**: Tracks all state-changing operations in the system for auditing and compliance.

**Fields**:
- `action`: string - The action performed (e.g., 'CREATE_USER', 'UPDATE_PO')
- `entity`: string - The entity affected (e.g., 'User', 'PurchaseOrder')
- `entityId`: ObjectId (optional) - The ID of the affected entity
- `performedBy`: ObjectId (ref: User) - The user who performed the action
- `details`: any - Optional JSON payload with additional info (e.g., changed fields)
- `timestamp`: Date - When the action occurred (auto: now)
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Optional, indexed

**Indexes**:
- `tenantId, timestamp` (compound, descending)
- `performedBy, timestamp` (compound, descending)
- `entity, entityId` (compound)

**Collection**: `audit_logs`

**Usage**:
Automatically handled by `auditLogMiddleware` for most requests or manually created for critical background jobs.

---

## Purchase Module Models

### 8. Vendor Model (`vendor.model.ts`)

**Purpose**: Vendor/supplier master data.

**Fields**:
- `vendorId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `vendorName`: string - Vendor name
- `gstNo`: string | null - GST number (optional, uppercase)
- `panNo`: string | null - PAN number (optional, uppercase)
- `contactDetails`: object
  - `phone`: string (optional)
  - `email`: string (optional, lowercase)
  - `address`: string (optional)
- `status`: VendorStatus enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, status` (compound)
- `tenantId, vendorName` (compound)

**Collection**: `vendors`

**Relationships**:
- Belongs to: `Tenant`
- Referenced by: `PurchaseOrder`, `SpecialOrder`

---

### 9. PurchaseOrder Model (`purchase-order.model.ts`)

**Purpose**: Purchase orders with approval workflow.

**Fields**:
- `poId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `vendorId`: ObjectId (ref: Vendor) - Required, indexed
- `createdBy`: ObjectId (ref: User) - Required, indexed
- `approvedBy`: ObjectId (ref: User) - Nullable, indexed
- `poDate`: Date - Order date (default: now, indexed)
- `deliveryDate`: Date | null - Expected delivery date
- `status`: PurchaseOrderStatus enum (OPEN | APPROVED | CLOSED)
- `totalAmount`: number - Total order amount (min: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId, status` (compound)
- `tenantId, vendorId` (compound)
- `tenantId, poDate` (compound, descending)
- `tenantId, createdBy` (compound)

**Collection**: `purchase_orders`

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `Vendor`
- Referenced by: `User` (createdBy, approvedBy), `PurchaseOrderItem`, `GRN`

**Workflow**:
1. Created by PE → Status: OPEN
2. Approved by BM → Status: APPROVED, `approvedBy` set
3. After GRN → Status: CLOSED

---

### 10. PurchaseOrderItem Model (`purchase-order-item.model.ts`)

**Purpose**: Line items for purchase orders.

**Fields**:
- `poItemId` (virtual): ObjectId - Primary key
- `poId`: ObjectId (ref: PurchaseOrder) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `quantity`: number - Quantity ordered (min: 0.01)
- `unitCost`: number - Unit cost (min: 0)
- `taxRate`: number - Tax rate percentage (min: 0, max: 100, default: 0)
- `totalPrice`: number - Total price including tax (min: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `poId, itemId` (compound)
- `poId` (single)
- `itemId` (single)

**Collection**: `purchase_order_items`

**Relationships**:
- Belongs to: `PurchaseOrder`, `Item`

**Calculation**:
```
totalPrice = (quantity * unitCost) * (1 + taxRate / 100)
```

---

## Special Order Module Models

### 11. SpecialOrder Model (`special-order.model.ts`)

**Purpose**: Special orders (same structure as PurchaseOrder but separate collection).

**Fields**:
- `soId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `vendorId`: ObjectId (ref: Vendor) - Required, indexed
- `createdBy`: ObjectId (ref: User) - Required, indexed
- `approvedBy`: ObjectId (ref: User) - Nullable, indexed
- `soDate`: Date - Order date (default: now, indexed)
- `deliveryDate`: Date | null - Expected delivery date
- `status`: SpecialOrderStatus enum (OPEN | APPROVED | CLOSED)
- `totalAmount`: number - Total order amount (min: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId, status` (compound)
- `tenantId, vendorId` (compound)
- `tenantId, soDate` (compound, descending)
- `tenantId, createdBy` (compound)

**Collection**: `special_orders`

**Note**: Structurally identical to PurchaseOrder but maintained separately for business logic separation.

---

### 12. SpecialOrderItem Model (`special-order-item.model.ts`)

**Purpose**: Line items for special orders.

**Fields**:
- `soItemId` (virtual): ObjectId - Primary key
- `soId`: ObjectId (ref: SpecialOrder) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `quantity`: number - Quantity ordered (min: 0.01)
- `unitCost`: number - Unit cost (min: 0)
- `totalPrice`: number - Total price (min: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `soId, itemId` (compound)
- `soId` (single)
- `itemId` (single)

**Collection**: `special_order_items`

**Note**: Similar to PurchaseOrderItem but without `taxRate` field.

---

## GRN & RTV Module Models

### 13. GRN Model (`grn.model.ts`)

**Purpose**: Goods Receipt Note - records receipt of goods from PO or SO.

**Fields**:
- `grnId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `poId`: ObjectId (ref: PurchaseOrder) - Nullable, indexed
- `soId`: ObjectId (ref: SpecialOrder) - Nullable, indexed
- `vendorInvoiceNo`: string - Vendor invoice number
- `goodsReceivedDate`: Date - Receipt date (default: now, indexed)
- `workAreaId`: ObjectId (ref: WorkArea) - Required, indexed
- `createdBy`: ObjectId (ref: User) - Required, indexed
- `totalAmount`: number - Total received amount (min: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId` (compound)
- `tenantId, poId` (compound)
- `tenantId, soId` (compound)
- `tenantId, goodsReceivedDate` (compound, descending)
- `tenantId, workAreaId` (compound)

**Collection**: `grns`

**Validation**:
- **Mutual Exclusivity**: Either `poId` OR `soId` must be provided, but not both
- Enforced via `pre('validate')` hook

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `PurchaseOrder` (optional), `SpecialOrder` (optional), `WorkArea`, `User`
- Referenced by: `GRNItem`, `RTV`

**Workflow**:
1. Created from APPROVED PO or SO
2. GRN items added
3. Inventory incremented based on GRN items

---

### 14. GRNItem Model (`grn-item.model.ts`)

**Purpose**: Line items for GRN.

**Fields**:
- `grnItemId` (virtual): ObjectId - Primary key
- `grnId`: ObjectId (ref: GRN) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `receivedQty`: number - Quantity received (min: 0.01)
- `unitCost`: number - Unit cost (min: 0)
- `taxAmount`: number - Tax amount (min: 0, default: 0)
- `totalAmount`: number - Total amount (min: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `grnId, itemId` (compound)
- `grnId` (single)
- `itemId` (single)

**Collection**: `grn_items`

**Relationships**:
- Belongs to: `GRN`, `Item`

**Calculation**:
```
totalAmount = (receivedQty * unitCost) + taxAmount
```

---

### 15. RTV Model (`rtv.model.ts`)

**Purpose**: Return to Vendor - records items returned to vendor.

**Fields**:
- `rtvId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `grnId`: ObjectId (ref: GRN) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `returnedQty`: number - Quantity returned (min: 0.01)
- `processedBy`: ObjectId (ref: User) - Required, indexed
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId` (compound)
- `tenantId, grnId` (compound)
- `tenantId, itemId` (compound)
- `tenantId, createdAt` (compound, descending)

**Collection**: `rtvs`

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `GRN`, `Item`, `User`

**Workflow**:
1. Created from GRN
2. Inventory decremented based on returned quantity

---

## Inventory & Store Module Models

### 16. Category Model (`category.model.ts`)

**Purpose**: Item categories (e.g., "Vegetables", "Dairy").

**Fields**:
- `categoryId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `name`: string - Category name
- `status`: CategoryStatus enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId, name` (compound, unique)

**Collection**: `categories`

---

### 17. Item Model (`item.model.ts`)

**Purpose**: Item master data - core inventory items.

**Fields**:
- `itemId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `categoryId`: ObjectId (ref: Category) - Required, indexed
- `itemCode`: string - Unique item code (uppercase, indexed)
- `itemName`: string - Item name
- `hsnCode`: string | null - HSN code (optional, uppercase)
- `inventoryUom`: string - Unit of measure (e.g., "KG", "LITRE", "PIECE")
- `unitCost`: number - Base unit cost (min: 0, default: 0)
- `taxRate`: number - Tax rate percentage (min: 0, max: 100, default: 0)
- `status`: ItemStatus enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, itemCode` (compound, unique)
- `tenantId, status` (compound)
- `tenantId, categoryId` (compound)
- `tenantId, itemName` (compound)

**Collection**: `items`

**Relationships**:
- Belongs to: `Tenant`, `Category`
- Referenced by: `PurchaseOrderItem`, `SpecialOrderItem`, `GRNItem`, `IndentItem`, `InventoryStock`, `ItemPackage`

---

### 18. ItemPackage Model (`item-package.model.ts`)

**Purpose**: Item packaging information (brand, quantity per package, etc.).

**Fields**:
- `packageId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `packageName`: string - Package name
- `brand`: string | null - Brand name (optional)
- `quantity`: number - Quantity per package (min: 0.01)
- `price`: number - Package price (min: 0)
- `parLevel`: number - Reorder level (min: 0, default: 0)
- `status`: string enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, itemId, status` (compound)
- `tenantId, itemId` (compound)

**Collection**: `item_packages`

**Relationships**:
- Belongs to: `Tenant`, `Item`

---

### 19. InventoryStock Model (`inventory-stock.model.ts`)

**Purpose**: Stock levels by item, branch, and work area.

**Fields**:
- `stockId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `workAreaId`: ObjectId (ref: WorkArea) - Required, indexed
- `quantityInStock`: number - Current stock quantity (min: 0, default: 0)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, itemId, branchId, workAreaId` (compound, unique)
- `tenantId, branchId, workAreaId` (compound)
- `tenantId, itemId` (compound)
- `tenantId, branchId` (compound)

**Collection**: `inventory_stocks`

**Relationships**:
- Belongs to: `Tenant`, `Item`, `Branch`, `WorkArea`

**Workflow**:
- Incremented when GRN items are received
- Decremented when RTV or Issue records are created

**Note**: Unique constraint ensures one stock record per item/branch/workArea combination.

---

### 20. WorkArea Model (`work-area.model.ts`)

**Purpose**: Work areas within branches (e.g., Store, Main Kitchen, etc.).

**Fields**:
- `workAreaId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `name`: string - Work area name
- `status`: string enum (ACTIVE | INACTIVE)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId, status` (compound)
- `tenantId, branchId, name` (compound)

**Collection**: `work_areas`

**Relationships**:
- Belongs to: `Tenant`, `Branch`
- Referenced by: `GRN`, `Indent`, `InventoryStock`

---

## Indent Module Models

### 21. Indent Model (`indent.model.ts`)

**Purpose**: Indent requests from work areas.

**Fields**:
- `indentId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `workAreaId`: ObjectId (ref: WorkArea) - Required, indexed
- `createdBy`: ObjectId (ref: User) - Required, indexed (IR role user)
- `indentDate`: Date - Indent date (default: now, indexed)
- `status`: IndentStatus enum (OPEN | APPROVED | ISSUED)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId, status` (compound)
- `tenantId, workAreaId` (compound)
- `tenantId, indentDate` (compound, descending)
- `tenantId, createdBy` (compound)

**Collection**: `indents`

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `WorkArea`, `User`
- Referenced by: `IndentItem`, `Issue`

**Workflow**:
1. Created by IR user → Status: OPEN
2. Approved by BM → Status: APPROVED
3. After Issue → Status: ISSUED

---

### 22. IndentItem Model (`indent-item.model.ts`)

**Purpose**: Line items for indents.

**Fields**:
- `indentItemId` (virtual): ObjectId - Primary key
- `indentId`: ObjectId (ref: Indent) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `requestedQty`: number - Quantity requested (min: 0.01)
- `issuedQty`: number - Quantity issued (min: 0, default: 0)
- `pendingQty`: number - Pending quantity (auto-calculated)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `indentId, itemId` (compound)
- `indentId` (single)
- `itemId` (single)

**Collection**: `indent_items`

**Relationships**:
- Belongs to: `Indent`, `Item`

**Auto-calculation**:
- `pendingQty = requestedQty - issuedQty`
- Enforced via `pre('save')` hook
- Minimum value: 0

---

### 23. Issue Model (`issue.model.ts`)

**Purpose**: Records issuance of items from inventory based on indents.

**Fields**:
- `issueId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `indentId`: ObjectId (ref: Indent) - Required, indexed
- `itemId`: ObjectId (ref: Item) - Required, indexed
- `issuedQty`: number - Quantity issued (min: 0.01)
- `issuedBy`: ObjectId (ref: User) - Required, indexed
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId` (compound)
- `tenantId, indentId` (compound)
- `tenantId, itemId` (compound)
- `tenantId, createdAt` (compound, descending)

**Collection**: `issues`

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `Indent`, `Item`, `User`

**Workflow**:
1. Created via `Indent.issue()`
2. Inventory decremented
3. IndentItem `issuedQty` updated
4. Indent status updated to ISSUED if fully served
