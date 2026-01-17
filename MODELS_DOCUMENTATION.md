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

### 16. Item Model (`item.model.ts`)

**Purpose**: Item master data - core inventory items.

**Fields**:
- `itemId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `categoryId`: ObjectId - Required, indexed (no ref - category model not defined)
- `subCategoryId`: ObjectId - Required, indexed (no ref - subcategory model not defined)
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
- `tenantId, subCategoryId` (compound)
- `tenantId, itemName` (compound)

**Collection**: `items`

**Relationships**:
- Belongs to: `Tenant`
- Referenced by: `PurchaseOrderItem`, `SpecialOrderItem`, `GRNItem`, `IndentItem`, `InventoryStock`, `ItemPackage`

**Note**: `categoryId` and `subCategoryId` are ObjectIds but don't have refs. Category models can be added later if needed.

---

### 17. ItemPackage Model (`item-package.model.ts`)

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

### 18. InventoryStock Model (`inventory-stock.model.ts`)

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

### 19. WorkArea Model (`work-area.model.ts`)

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

### 20. Indent Model (`indent.model.ts`)

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

### 21. IndentItem Model (`indent-item.model.ts`)

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

### 22. Issue Model (`issue.model.ts`)

**Purpose**: Records issuance of items from inventory based on indents.

**Fields**:
- `issueId` (virtual): ObjectId - Primary key
- `tenantId`: ObjectId (ref: Tenant) - Required, indexed
- `branchId`: ObjectId (ref: Branch) - Required, indexed
- `indentId`: ObjectId (ref: Indent) - Required, indexed
- `issuedBy`: ObjectId (ref: User) - Required, indexed (SM role user)
- `issueDate`: Date - Issue date (default: now, indexed)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Indexes**:
- `tenantId, branchId` (compound)
- `tenantId, indentId` (compound)
- `tenantId, issueDate` (compound, descending)
- `tenantId, issuedBy` (compound)

**Collection**: `issues`

**Relationships**:
- Belongs to: `Tenant`, `Branch`, `Indent`, `User`

**Workflow**:
1. Created by SM user from APPROVED indent
2. Updates `IndentItem.issuedQty`
3. Decrements `InventoryStock.quantityInStock`
4. Updates `Indent.status` to ISSUED

---

## Relationships & Data Flow

### Entity Relationship Diagram (Conceptual)

```
Tenant (1) ──< (N) Branch
Tenant (1) ──< (N) User
Tenant (1) ──< (N) Vendor
Tenant (1) ──< (N) Item
Tenant (1) ──< (N) WorkArea

Branch (1) ──< (N) User
Branch (1) ──< (N) WorkArea
Branch (1) ──< (N) PurchaseOrder
Branch (1) ──< (N) SpecialOrder
Branch (1) ──< (N) GRN
Branch (1) ──< (N) Indent
Branch (1) ──< (N) Issue
Branch (1) ──< (N) InventoryStock

Role (1) ──< (N) User
Role (1) ──< (N) RolePermission
Permission (1) ──< (N) RolePermission

Vendor (1) ──< (N) PurchaseOrder
Vendor (1) ──< (N) SpecialOrder

PurchaseOrder (1) ──< (N) PurchaseOrderItem
PurchaseOrder (1) ──< (0..1) GRN

SpecialOrder (1) ──< (N) SpecialOrderItem
SpecialOrder (1) ──< (0..1) GRN

GRN (1) ──< (N) GRNItem
GRN (1) ──< (N) RTV

Item (1) ──< (N) PurchaseOrderItem
Item (1) ──< (N) SpecialOrderItem
Item (1) ──< (N) GRNItem
Item (1) ──< (N) IndentItem
Item (1) ──< (N) InventoryStock
Item (1) ──< (N) ItemPackage
Item (1) ──< (N) RTV

WorkArea (1) ──< (N) GRN
WorkArea (1) ──< (N) Indent
WorkArea (1) ──< (N) InventoryStock

Indent (1) ──< (N) IndentItem
Indent (1) ──< (N) Issue

User (1) ──< (N) PurchaseOrder (createdBy)
User (1) ──< (N) PurchaseOrder (approvedBy)
User (1) ──< (N) GRN (createdBy)
User (1) ──< (N) RTV (processedBy)
User (1) ──< (N) Indent (createdBy)
User (1) ──< (N) Issue (issuedBy)
```

### Business Flow Diagrams

#### 1. Purchase Order Flow
```
PE creates PO (OPEN)
    ↓
BM approves PO (APPROVED)
    ↓
GRN created from PO
    ↓
GRN items received
    ↓
Inventory incremented
    ↓
PO status → CLOSED
```

#### 2. Indent Flow
```
IR creates Indent (OPEN)
    ↓
BM approves Indent (APPROVED)
    ↓
SM creates Issue from Indent
    ↓
Inventory decremented
    ↓
Indent status → ISSUED
```

#### 3. RTV Flow
```
GRN created
    ↓
Items received
    ↓
RTV created (if items need return)
    ↓
Inventory decremented
```

---

## Indexes & Performance

### Index Strategy

All models follow these indexing principles:

1. **Multi-tenancy First**: All indexes start with `tenantId` for tenant isolation
2. **Compound Indexes**: Common query patterns use compound indexes
3. **Unique Constraints**: Where business logic requires uniqueness
4. **Descending Indexes**: For date-based queries (newest first)

### Key Index Patterns

```typescript
// Tenant isolation + status filtering
{ tenantId: 1, status: 1 }

// Tenant isolation + branch filtering
{ tenantId: 1, branchId: 1 }

// Tenant isolation + date sorting (descending)
{ tenantId: 1, poDate: -1 }

// Unique constraints
{ tenantId: 1, email: 1 } // User email uniqueness per tenant
{ tenantId: 1, itemCode: 1 } // Item code uniqueness per tenant
{ tenantId: 1, itemId: 1, branchId: 1, workAreaId: 1 } // Stock uniqueness
```

### Query Optimization Tips

1. **Always filter by tenantId first**:
   ```typescript
   await PurchaseOrder.find({ tenantId, branchId, status: 'APPROVED' });
   ```

2. **Use lean() for read-only queries**:
   ```typescript
   await PurchaseOrder.find({ tenantId }).lean();
   ```

3. **Use select() to limit fields**:
   ```typescript
   await User.find({ tenantId }).select('name email roleId');
   ```

4. **Use populate() sparingly**:
   ```typescript
   await PurchaseOrder.find({ tenantId })
     .populate('vendorId', 'vendorName')
     .populate('createdBy', 'name email');
   ```

---

## Usage Examples

### 1. Creating a Tenant and Initial Setup

```typescript
import mongoose from 'mongoose';
import {
  Tenant,
  Branch,
  Role,
  Permission,
  RolePermission,
  User,
} from './models';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI!);

// 1. Create tenant
const tenant = await Tenant.create({
  tenantName: 'Acme Corporation',
  status: 'ACTIVE',
});

// 2. Create branch
const branch = await Branch.create({
  tenantId: tenant._id,
  branchName: 'Main Branch',
  location: 'New York, NY',
  status: 'ACTIVE',
});

// 3. Create roles
const saRole = await Role.create({
  roleCode: 'SA',
  roleName: 'Super Admin',
});

const smRole = await Role.create({
  roleCode: 'SM',
  roleName: 'Store Manager',
});

// 4. Create permissions
const poCreatePermission = await Permission.create({
  permissionCode: 'PO.CREATE',
  moduleName: 'Purchase Order',
});

const poApprovePermission = await Permission.create({
  permissionCode: 'PO.APPROVE',
  moduleName: 'Purchase Order',
});

// 5. Map permissions to roles
await RolePermission.create({
  roleId: smRole._id,
  permissionId: poCreatePermission._id,
});

// 6. Create user
const user = await User.create({
  tenantId: tenant._id,
  branchId: branch._id,
  roleId: smRole._id,
  name: 'John Doe',
  email: 'john@acme.com',
  passwordHash: await hashPassword('password123'),
  status: 'ACTIVE',
});
```

### 2. Purchase Order Workflow

```typescript
import {
  Vendor,
  PurchaseOrder,
  PurchaseOrderItem,
  Item,
  GRN,
  GRNItem,
  InventoryStock,
} from './models';

// 1. Create vendor
const vendor = await Vendor.create({
  tenantId: tenantId,
  vendorName: 'Supplier ABC',
  gstNo: 'GST123456',
  contactDetails: {
    email: 'contact@supplier.com',
    phone: '+1234567890',
  },
  status: 'ACTIVE',
});

// 2. Create purchase order
const po = await PurchaseOrder.create({
  tenantId: tenantId,
  branchId: branchId,
  vendorId: vendor._id,
  createdBy: userId,
  poDate: new Date(),
  status: 'OPEN',
  totalAmount: 0,
});

// 3. Add items
const item = await Item.findOne({ tenantId, itemCode: 'ITEM001' });
const poItem = await PurchaseOrderItem.create({
  poId: po._id,
  itemId: item._id,
  quantity: 100,
  unitCost: 50,
  taxRate: 18,
  totalPrice: 5900, // (100 * 50) * 1.18
});

// Update PO total
po.totalAmount += poItem.totalPrice;
await po.save();

// 4. Approve PO (by Branch Manager)
po.status = 'APPROVED';
po.approvedBy = branchManagerId;
await po.save();

// 5. Create GRN
const grn = await GRN.create({
  tenantId: tenantId,
  branchId: branchId,
  poId: po._id,
  soId: null,
  vendorInvoiceNo: 'INV-2024-001',
  goodsReceivedDate: new Date(),
  workAreaId: workAreaId,
  createdBy: userId,
  totalAmount: 0,
});

// 6. Add GRN items
const grnItem = await GRNItem.create({
  grnId: grn._id,
  itemId: item._id,
  receivedQty: 100,
  unitCost: 50,
  taxAmount: 900,
  totalAmount: 5900,
});

grn.totalAmount += grnItem.totalAmount;
await grn.save();

// 7. Update inventory
const stock = await InventoryStock.findOneAndUpdate(
  {
    tenantId: tenantId,
    itemId: item._id,
    branchId: branchId,
    workAreaId: workAreaId,
  },
  {
    $inc: { quantityInStock: grnItem.receivedQty },
  },
  { upsert: true, new: true }
);

// 8. Close PO
po.status = 'CLOSED';
await po.save();
```

### 3. Indent and Issue Workflow

```typescript
import { Indent, IndentItem, Issue, InventoryStock } from './models';

// 1. Create indent (by IR user)
const indent = await Indent.create({
  tenantId: tenantId,
  branchId: branchId,
  workAreaId: workAreaId,
  createdBy: irUserId,
  indentDate: new Date(),
  status: 'OPEN',
});

// 2. Add indent items
const indentItem = await IndentItem.create({
  indentId: indent._id,
  itemId: itemId,
  requestedQty: 50,
  issuedQty: 0,
  pendingQty: 50,
});

// 3. Approve indent (by Branch Manager)
indent.status = 'APPROVED';
await indent.save();

// 4. Create issue (by SM user)
const issue = await Issue.create({
  tenantId: tenantId,
  branchId: branchId,
  indentId: indent._id,
  issuedBy: smUserId,
  issueDate: new Date(),
});

// 5. Update indent item
indentItem.issuedQty = 50;
indentItem.pendingQty = 0;
await indentItem.save();

// 6. Decrement inventory
await InventoryStock.findOneAndUpdate(
  {
    tenantId: tenantId,
    itemId: itemId,
    branchId: branchId,
    workAreaId: workAreaId,
  },
  {
    $inc: { quantityInStock: -50 },
  }
);

// 7. Update indent status
indent.status = 'ISSUED';
await indent.save();
```

### 4. RTV (Return to Vendor)

```typescript
import { RTV, InventoryStock } from './models';

// Create RTV
const rtv = await RTV.create({
  tenantId: tenantId,
  branchId: branchId,
  grnId: grnId,
  itemId: itemId,
  returnedQty: 10,
  processedBy: userId,
});

// Decrement inventory
await InventoryStock.findOneAndUpdate(
  {
    tenantId: tenantId,
    itemId: itemId,
    branchId: branchId,
    workAreaId: workAreaId,
  },
  {
    $inc: { quantityInStock: -rtv.returnedQty },
  }
);
```

### 5. Transaction Example (Multi-document Operations)

```typescript
import mongoose from 'mongoose';

const session = await mongoose.startSession();
session.startTransaction();

try {
  // Create PO
  const po = await PurchaseOrder.create([{
    tenantId: tenantId,
    branchId: branchId,
    vendorId: vendorId,
    createdBy: userId,
    status: 'OPEN',
    totalAmount: 0,
  }], { session });

  // Create PO items
  const items = await PurchaseOrderItem.insertMany([
    {
      poId: po[0]._id,
      itemId: item1Id,
      quantity: 10,
      unitCost: 100,
      taxRate: 18,
      totalPrice: 1180,
    },
    {
      poId: po[0]._id,
      itemId: item2Id,
      quantity: 20,
      unitCost: 50,
      taxRate: 18,
      totalPrice: 1180,
    },
  ], { session });

  // Update PO total
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
  await PurchaseOrder.findByIdAndUpdate(
    po[0]._id,
    { $set: { totalAmount: total } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## Best Practices

### 1. Multi-tenancy Isolation

**Always filter by tenantId first**:
```typescript
// ✅ Good
const items = await Item.find({ tenantId, status: 'ACTIVE' });

// ❌ Bad - security risk
const items = await Item.find({ status: 'ACTIVE' });
```

### 2. Status-based Soft Deletes

**Never use hard deletes**:
```typescript
// ✅ Good
await User.findByIdAndUpdate(userId, { status: 'INACTIVE' });

// ❌ Bad
await User.findByIdAndDelete(userId);
```

### 3. Virtual IDs Usage

**Use virtual IDs in responses**:
```typescript
// Virtual IDs are automatically included in toJSON()
const user = await User.findById(userId);
console.log(user.toJSON()); // { userId: ..., name: ..., email: ... }
```

### 4. Population Strategy

**Populate only what you need**:
```typescript
// ✅ Good - selective population
const po = await PurchaseOrder.findById(poId)
  .populate('vendorId', 'vendorName')
  .populate('createdBy', 'name email');

// ❌ Bad - over-population
const po = await PurchaseOrder.findById(poId)
  .populate('vendorId')
  .populate('createdBy')
  .populate('branchId')
  .populate('tenantId');
```

### 5. Index-aware Queries

**Structure queries to use indexes**:
```typescript
// ✅ Good - uses compound index { tenantId: 1, branchId: 1, status: 1 }
const pos = await PurchaseOrder.find({
  tenantId,
  branchId,
  status: 'APPROVED',
});

// ❌ Bad - can't use index efficiently
const pos = await PurchaseOrder.find({
  status: 'APPROVED',
  branchId,
  tenantId,
});
```

### 6. Validation at Model Level

**Use Mongoose validators**:
```typescript
// GRN model already validates poId/soId mutual exclusivity
const grn = await GRN.create({
  tenantId,
  poId: poId,
  soId: soId, // ❌ Will throw error
});
```

### 7. Type Safety

**Always use TypeScript interfaces**:
```typescript
import { IPurchaseOrder } from './models';

async function createPO(data: Partial<IPurchaseOrder>): Promise<IPurchaseOrder> {
  return await PurchaseOrder.create(data);
}
```

### 8. Error Handling

**Handle validation errors**:
```typescript
try {
  const po = await PurchaseOrder.create(data);
} catch (error) {
  if (error instanceof mongoose.Error.ValidationError) {
    // Handle validation errors
  }
}
```

---

## Dependencies

### Package.json Updates

```json
{
  "dependencies": {
    "mongoose": "^8.0.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

### Installation

```bash
bun install
# or
npm install
```

---

## File Structure

```
src/models/
├── tenant.model.ts
├── branch.model.ts
├── user.model.ts
├── role.model.ts
├── permission.model.ts
├── role-permission.model.ts
├── vendor.model.ts
├── purchase-order.model.ts
├── purchase-order-item.model.ts
├── special-order.model.ts
├── special-order-item.model.ts
├── grn.model.ts
├── grn-item.model.ts
├── rtv.model.ts
├── item.model.ts
├── item-package.model.ts
├── inventory-stock.model.ts
├── work-area.model.ts
├── indent.model.ts
├── indent-item.model.ts
├── issue.model.ts
└── index.ts
```

---

## Summary

This documentation covers all 21 Mongoose models for the Inventory Management System:

- ✅ **6 AUTH & RBAC models** - Multi-tenancy and access control
- ✅ **3 Purchase module models** - Purchase orders and vendors
- ✅ **2 Special Order models** - Special order handling
- ✅ **3 GRN & RTV models** - Goods receipt and returns
- ✅ **4 Inventory & Store models** - Items, stock, and work areas
- ✅ **3 Indent module models** - Indent requests and issues

All models are:
- Production-ready
- TypeScript strict mode compliant
- Multi-tenant aware
- Properly indexed
- Transaction-safe
- Soft-delete enabled
- Fully documented

---

**Last Updated**: 2024
**Version**: 1.0.0
**Framework**: Hono.js + Mongoose + TypeScript
