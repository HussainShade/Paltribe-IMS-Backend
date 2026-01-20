# IMP Backend - API Documentation

**Base URL**: `http://localhost:3000/api/v1`

## 📏 Standard API Response
All API endpoints return a consistent JSON structure.

**Success Response**:
```json
{
  "statusCode": 200,
  "data": { ... }, // Object or Array
  "message": "Operation successful",
  "success": true
}
```

**Error Response**:
```json
{
  "statusCode": 400, // or 401, 404, 500 etc.
  "message": "Error description",
  "errors": [], // Optional validation errors
  "success": false
}
```

## 🧪 Sequential Testing Flow
To test the entire system manually after running `npm run seed`, follow this order:
1.  **Login** as Super Admin or Branch Manager (Credentials in Seed Output).
2.  **Setup Masters**: Create **Work Areas**, **Categories**, **Vendors**.
3.  **Create Items**: Create Items using the Categories.
4.  **Procurement**: Create **PO** -> Approve PO -> Create **GRN** (Stock increases).
5.  **Operations**: Check **Inventory** -> Create **Indent** -> Issue Stock (Stock decreases).
6.  **Analyze**: Check **Dashboard**, **Reports**, and **Audit Logs**.

---

## 1. Authentication
*Start here to get your Access Token.*

### Login
**POST** `/auth/login`
**Response** includes `accessToken`. Use this token in the header `Authorization: Bearer <token>` for all subsequent requests.

**Body**:
```json
{
    "tenantId": "<TenantID_from_Seed_Output>",
    "email": "admin@paltribe.com",
    "password": "password123"
}
```

### Refresh Token
**POST** `/auth/refresh`
**Body**: `{"refreshToken": "..."}`

---

## 2. System Setup (Master Data)
*Create these first as they are required for operations.*

### Branch Management
*Required for Work Areas*

#### Create Branch
**POST** `/branches`
```json
{
    "branchName": "Downtown Branch",
    "location": "City Center",
    "status": "ACTIVE"
}
```

#### List Branches
**GET** `/branches`

### Work Area Management
*Kitchens, Bars, Stores*

#### Create Work Area
**POST** `/work-areas`
```json
{
    "name": "Main Kitchen",
    "branchIds": ["<BranchID_from_Seed_Output>"],
    "status": "ACTIVE"
}
```

#### List Work Areas
**GET** `/work-areas`

### Category Management
*Food, Liquor, Consumables*

#### Create Category
**POST** `/categories`
```json
{
    "name": "Vegetables",
    "status": "ACTIVE"
}
```

#### List Categories
**GET** `/categories`

### Vendor Management
*Suppliers*

#### Create Vendor
**POST** `/vendors`
```json
{
    "vendorName": "Fresh Farms Ltd",
    "gstNo": "GSTIN123",
    "contactDetails": { "phone": "9999999999" }
}
```

#### List Vendors
**GET** `/vendors`

---

## 3. Product Management
*Requires Categories to exist.*

### Item Management

#### Create Item
**POST** `/items`
```json
{
    "itemCode": "VEG-001",
    "itemName": "Tomato",
    "categoryId": "<CategoryID>",
    "inventoryUom": "KG",
    "unitCost": 40,
    "taxRate": 5,
    "ledger": "General Ledger",
    "classification": "Vegetable",
    "yield": 95,
    "weight": 1000,
    "leadTime": 2,
    "packageDetails": [
      { "name": "Box", "brand": "FarmFresh", "qty": 10, "price": 400, "parLevel": 5 }
    ]
}
```

#### List Items
**GET** `/items`

---

## 4. Procurement Cycle (Inbound)
*Requires Vendors and Items.*

### Purchase Orders (PO)

#### Create PO
**POST** `/purchase-orders`
```json
{
    "prNo": "PR-1001",
    "vendorId": "<VendorID>",
    "deliveryDate": "2024-12-31",
    "items": [
        { "itemId": "<ItemID>", "quantity": 100, "unitCost": 40, "taxRate": 5 }
    ]
}
```

#### List Pending POs
**GET** `/purchase-orders?status=PENDING`

#### Approve PO
**PATCH** `/purchase-orders/:id/approve`
Body: `{"status": "APPROVED"}`

### Goods Received Note (GRN)
*Requires Approved PO and Work Area.*

#### Create GRN
**POST** `/grn`
This action **increases stock**.
```json
{
    "poId": "<Approved_PO_ID>",
    "vendorInvoiceNo": "INV-2024-001",
    "vendorInvoiceDate": "2024-12-30",
    "workAreaId": "<WorkAreaID>",
    "items": [
        { "itemId": "<ItemID>", "receivedQty": 100, "unitCost": 40, "taxAmount": 100 }
    ]
}
```

#### List GRNs
**GET** `/grn`

---

## 5. Operations (Internal)
*Requires Stock (from GRN).*

### Inventory (Live Stock)
**GET** `/inventory`
Check if stock increased after GRN.

### Indents (Internal Requests)

#### Create Indent
**POST** `/indents`
```json
{
    "workAreaId": "<WorkAreaID>",
    "remarks": "Urgent Requirement",
    "entryType": "OPEN",
    "items": [ { "itemId": "<ItemID>", "requestedQty": 10 } ]
}
```

#### List Indents
**GET** `/indents`

#### Issue Indent (Move Stock)
**POST** `/indents/issue`
This action **decreases stock**.
```json
{
    "indentId": "<IndentID>",
    "items": [ { "itemId": "<ItemID>", "issuedQty": 10 } ]
}
```

---

## 6. Dashboards & Reports
*View the results of your operations.*

### Dashboard
**GET** `/dashboard/stats`
(Total Stock Value, Pending POs, etc.)

### Reports
**GET** `/reports/live-stock`
**GET** `/reports/po-status`
**GET** `/reports/detailed-grn`
*(See list of all 12 reports in previous section)*

---

## 7. User & Role Administration
*Manage access and users.*

### User Management
**POST** `/users`
**GET** `/users`

### Role Management
**GET** `/roles`
**GET** `/roles/:id`
**PUT** `/roles/:id/permissions` (Update Permissions)

### Permission Management
**GET** `/permissions`

### Profile
**GET** `/profile/me`
**PUT** `/profile/change-password`



### Audit Logs
**GET** `/audit-logs`

---

## 8. Returns & Special Orders (New Modules)

### Returns (RTV)
*Return items to vendor from a specific GRN.*

#### Create RTV
**POST** `/rtv`
This action **decreases stock**.
```json
{
    "grnId": "<GRN_ID>",
    "itemId": "<ITEM_ID>",
    "returnedQty": 10,
    "reason": "Damaged goods"
}
```

#### List RTVs
**GET** `/rtv`

### Special Orders
*Ad-hoc orders.*

#### Create Special Order
**POST** `/special-orders`
```json
{
    "vendorId": "<VENDOR_ID>",
    "items": [...],
    "deliveryDate": "2024-12-31"
}
```

#### List Special Orders
**GET** `/special-orders`

#### Approve/Close
**PATCH** `/special-orders/:id/approve`
**PATCH** `/special-orders/:id/close`

---

## 9. Extended CRUD Operations

### Purchase Orders
**PATCH** `/purchase-orders/:id` (Update fields like `deliveryDate`)
**PATCH** `/purchase-orders/:id/cancel` (Cancel OPEN PO)
**DELETE** `/purchase-orders/:id` (Delete OPEN PO)

### Indents
**PATCH** `/indents/:id/reject` (Reject OPEN Indent)
**PATCH** `/indents/:id/cancel` (Cancel OPEN Indent)

### Inventory
**POST** `/inventory/adjust` (Manual Stock Adjustment)
Actions: Positive quantity adds stock, negative removes stock. Use for audit corrections.
```json
{
    "itemId": "<ITEM_ID>",
    "workAreaId": "<WORK_AREA_ID>",
    "quantity": -5,
    "reason": "Spillage"
}
```
