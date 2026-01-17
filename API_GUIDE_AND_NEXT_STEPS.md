# IMP Backend - Next Steps & API Guide

## 🚀 Recommended Next Steps

Based on the current state of the codebase, here is the recommended path forward:

1.  **Test Existing Modules**:
    *   Verify the **Auth Flow** (Login, Refresh Token).
    *   Test **User/Vendor/Item/Branch** CRUD operations.
    *   Test **Purchase Order (PO)** creation and approval.
    *   Test **GRN** creation against a PO.
    *   Test **Indent** creation and issuing.
    *   Review **Audit Logs** for all state changes.

2.  **Verify Master Data CRUDs**:
    *   Implementations for `User`, `Vendor`, `Item`, `Branch`, and `AuditLog` are now in place.
    *   **Validated**: `User` Management.
    *   **Validated**: `Vendor` Management.
    *   **Validated**: `Item` Management.
    *   **Validated**: `Branch` Management.

3.  **Implement Remaining Inventory Flows**:
    *   **Stock Transfer**: Logic for moving items between Work Areas (Store -> Kitchen).
    *   **Production/Recipe**: Deducting stock based on sales (if applicable) or manual consumption.
    *   **Stock Adjustment**: Manual corrections for breakage/shrinkage.

4.  **Reports & Analytics**:
    *   Implement the `ReportQueue` logic to generate PDF/Excel reports (Stock Balance, PO History).

---

## �️ Setup for Testing (Postman)

Before testing, you must seed the database with a Super Admin user.

1.  **Run Seed Script**:
    ```bash
    bun run src/scripts/seed.ts
    ```
    *This will create a Tenant, Roles, Permissions, and a Super Admin user.*

2.  **Super Admin Credentials**:
    *   **Email**: `admin@paltribe.com`
    *   **Password**: `password123`
    *   **Tenant ID**: *(Copy from the seed script output)*

---

## �📡 API Reference (For Postman)

**Base URL**: `http://localhost:3000/api/v1`

### 1. Authentication (Start Here)
*Login to get your access token.*

| Action | Method | URL | Body (JSON) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | `POST` | `/auth/login` | `{ "tenantId": "<YOUR_TENANT_ID>", "email": "admin@paltribe.com", "password": "password123" }` | **Step 1**: Run this first. Copy the `accessToken` from the response. URL: `http://localhost:3000/api/v1/auth/login` |

### 2. Master Data Management (New!)

To manage the system, you must have the appropriate permissions (e.g., `USER.CREATE`, `VENDOR.UPDATE`).

#### User Management

| Action | Method | URL | Body / Notes |
| :--- | :--- | :--- | :--- |
| **Create User** | `POST` | `/users` | `{ "name": "John", "email": "john@example.com", "password": "...", "roleId": "...", "tenantId": "..." }` |
| **List Users** | `GET` | `/users` | Query: `?page=1&limit=10` |
| **Get User** | `GET` | `/users/:id` | |
| **Update User** | `PATCH` | `/users/:id` | Partial body `{ "name": "New Name" }` |
| **Delete User** | `DELETE` | `/users/:id` | Soft delete |

#### Vendor Management

| Action | Method | URL | Body / Notes |
| :--- | :--- | :--- | :--- |
| **Create Vendor** | `POST` | `/vendors` | `{ "vendorName": "ABC Corp", "gstNo": "...", "contactDetails": { ... } }` |
| **List Vendors** | `GET` | `/vendors` | Query: `?page=1&limit=10&search=abc` |
| **Get Vendor** | `GET` | `/vendors/:id` | |
| **Update Vendor** | `PATCH` | `/vendors/:id` | Partial body |
| **Delete Vendor** | `DELETE` | `/vendors/:id` | Soft delete |

#### Item Management

| Action | Method | URL | Body / Notes |
| :--- | :--- | :--- | :--- |
| **Create Item** | `POST` | `/items` | `{ "itemCode": "ITM01", "itemName": "Item 1", "categoryId": "...", "unitCost": 10 }` |
| **List Items** | `GET` | `/items` | Query: `?page=1&limit=10&search=item` |
| **Get Item** | `GET` | `/items/:id` | |
| **Update Item** | `PATCH` | `/items/:id` | Partial body |
| **Delete Item** | `DELETE` | `/items/:id` | Soft delete |

#### Branch Management

| Action | Method | URL | Body / Notes |
| :--- | :--- | :--- | :--- |
| **Create Branch** | `POST` | `/branches` | `{ "branchName": "Main", "location": "City" }` |
| **List Branches** | `GET` | `/branches` | |

#### Audit Logs

| Action | Method | URL | Body / Notes |
| :--- | :--- | :--- | :--- |
| **List Logs** | `GET` | `/audit-logs` | Query: `?page=1&limit=20` |

### 2. Authentication
*Manage user access and tokens.*

| Action | Method | URL | Body (JSON) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | `POST` | `/auth/login` | `{ "tenantId": "...", "email": "admin@example.com", "password": "password123" }` | Returns `accessToken`, `refreshToken`, `user`. |
| **Refresh Token** | `POST` | `/auth/refresh` | `{ "refreshToken": "..." }` | Returns new `accessToken`. |

### 2. Purchase Orders (PO)
*Procurement flow.*

| Action | Method | URL | Body (JSON) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Create PO** | `POST` | `/purchase-orders` | See **Schema A** below | Requires `PO.CREATE` permission. |
| **Approve PO** | `PATCH` | `/purchase-orders/:id/approve` | `{ "status": "APPROVED" }` | Requires `PO.APPROVE` permission. |

**Schema A (Create PO)**:
```json
{
  "vendorId": "vendor_mongo_id",
  "deliveryDate": "2024-12-31T00:00:00Z",
  "items": [
    {
      "itemId": "item_mongo_id",
      "quantity": 100,
      "unitCost": 50,
      "taxRate": 5
    }
  ]
}
```

### 3. Goods Received Note (GRN)
*Receiving stock against a PO.*

| Action | Method | URL | Body (JSON) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Create GRN** | `POST` | `/grn` | See **Schema B** below | Requires `GRN.CREATE` permission. Updates inventory. |

**Schema B (Create GRN)**:
```json
{
  "poId": "purchase_order_mongo_id", 
  "vendorInvoiceNo": "INV-2024-001",
  "workAreaId": "store_work_area_id",
  "items": [
    {
      "itemId": "item_mongo_id",
      "receivedQty": 100,
      "unitCost": 50,
      "taxAmount": 250
    }
  ]
}
```
*Note: You can also use `soId` (Special Order ID) instead of `poId` if receiving against a generic order, but not both.*

### 4. Indents (Internal Requests)
*Kitchen requesting stock from Store.*

| Action | Method | URL | Body (JSON) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Create Indent** | `POST` | `/indents` | See **Schema C** below | Requires `INDENT.CREATE`. |
| **Approve Indent** | `PATCH` | `/indents/:id/approve` | (No body required implies approval) | Requires `INDENT.APPROVE`. |
| **Issue Indent** | `POST` | `/indents/issue` | See **Schema D** below | Requires `INDENT.ISSUE`. Moves stock. |

**Schema C (Create Indent)**:
```json
{
  "workAreaId": "kitchen_work_area_id",
  "items": [
    {
      "itemId": "item_mongo_id",
      "requestedQty": 10
    }
  ]
}
```

**Schema D (Issue Indent)**:
```json
{
  "indentId": "indent_mongo_id",
  "items": [
    {
      "itemId": "item_mongo_id",
      "issuedQty": 10
    }
  ]
}
```

### 5. Inventory
*Check stock levels.*

| Action | Method | URL | Body (JSON) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Get Stock** | `GET` | `/inventory` | *None* | Returns stock for user's tenant & branch. |

---

### 🔑 Headers for Authenticated Requests
For all requests except `/auth/login` and `/auth/refresh`, you must include:
*   **Authorization**: `Bearer <your_access_token>`
*   **x-tenant-id**: `<tenant_id>` (Often required by middleware context)
*   **x-branch-id**: `<branch_id>` (If operation is branch-specific)
