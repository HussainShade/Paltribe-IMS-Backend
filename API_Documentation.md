# IMP Backend - API Documentation

**Base URL**: `http://localhost:3000/api/v1`

This documentation details all available API endpoints, their methods, request bodies, and success responses.

---

## 1. System Health

### Check Health status
**GET** `/health` (Root level, not under `/api/v1`)
**URL**: `http://localhost:3000/health`

**Response**:
```json
{
    "status": "ok",
    "uptime": 123.45
}
```

---

## 2. Authentication

### Login
**POST** `/auth/login`

**Body**:
```json
{
    "tenantId": "<TenantID>",
    "email": "admin@paltribe.com",
    "password": "password123"
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "user": {
            "tenantId": "...",
            "branchId": null,
            "roleId": "...",
            "name": "Paltribe Admin",
            "email": "admin@paltribe.com",
            "status": "ACTIVE"
        },
        "permissions": [ "USER.CREATE", "..." ],
        "accessToken": "<accessToken>",
        "refreshToken": "<refreshToken>"
    }
}
```

### Refresh Token
**POST** `/auth/refresh`

**Body**:
```json
{
    "refreshToken": "<refreshToken>"
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "accessToken": "<accessToken>"
    }
}
```

---

## 3. User Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create User
**POST** `/users`
*Permission*: `USER.CREATE`

**Body**:
```json
{
    "name": "Branch Manager",
    "email": "manager@paltribe.com",
    "password": "password123",
    "roleId": "<RoleID>",
    "branchId": "<BranchID>"
}
```

### List Users
**GET** `/users`
*Permission*: `USER.VIEW`
*Query Params*: `?page=1&limit=10`

### Get User
**GET** `/users/:id`
*Permission*: `USER.VIEW`

### Update User
**PATCH** `/users/:id`
*Permission*: `USER.UPDATE`

**Body**:
```json
{
    "name": "New Name"
}
```

### Delete User
**DELETE** `/users/:id`
*Permission*: `USER.DELETE`

---

## 4. Vendor Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Vendor
**POST** `/vendors`
*Permission*: `VENDOR.CREATE`

**Body**:
```json
{
    "vendorName": "Acme Supplies",
    "gstNo": "GSTIN12345",
    "contactDetails": {
        "phone": "9876543210",
        "email": "contact@acme.com",
        "address": "123 Supply St"
    }
}
```

### List Vendors
**GET** `/vendors`
*Permission*: `VENDOR.VIEW`
*Query Params*: `?page=1&limit=10&search=...`

### Get Vendor
**GET** `/vendors/:id`
*Permission*: `VENDOR.VIEW`

### Update Vendor
**PATCH** `/vendors/:id`
*Permission*: `VENDOR.UPDATE`

### Delete Vendor
**DELETE** `/vendors/:id`
*Permission*: `VENDOR.DELETE`

---

## 5. Branch Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Branch
**POST** `/branches`
*Permission*: `BRANCH.CREATE`

**Body**:
```json
{
    "branchName": "Main Branch",
    "location": "Downtown"
}
```

### List Branches
**GET** `/branches`
*Permission*: `BRANCH.VIEW`

### Update Branch
**PATCH** `/branches/:id`
*Permission*: `BRANCH.UPDATE`

**Body**:
```json
{
    "branchName": "New Branch Name",
    "location": "New Location"
}
```

---

## 6. Category Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Category
**POST** `/categories`
*Permission*: `CATEGORY.CREATE`

**Body**:
```json
{
    "name": "Electronics",
    "status": "ACTIVE"
}
```

### List Categories
**GET** `/categories`
*Permission*: `CATEGORY.VIEW`

---

## 7. Item Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Item
**POST** `/items`
*Permission*: `ITEM.CREATE`

**Body**:
```json
{
    "itemCode": "VEG-001",
    "itemName": "Fresh Tomato",
    "categoryId": "<CategoryID>",
    "inventoryUom": "KG",
    "unitCost": 40,
    "taxRate": 5
}
```

### List Items
**GET** `/items`
*Permission*: `ITEM.VIEW`
*Query Params*: `?page=1&limit=10&search=...&categoryId=...`

### Get Item
**GET** `/items/:id`
*Permission*: `ITEM.VIEW`

### Update Item
**PATCH** `/items/:id`
*Permission*: `ITEM.UPDATE`

### Delete Item
**DELETE** `/items/:id`
*Permission*: `ITEM.DELETE`

---

## 8. Purchase Orders (PO)
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create PO
**POST** `/purchase-orders`
*Permission*: `PO.CREATE`

**Body**:
```json
{
    "vendorId": "<VendorID>",
    "deliveryDate": "2024-12-31T00:00:00.000Z",
    "items": [
        {
            "itemId": "<ItemID>",
            "quantity": 100,
            "unitCost": 40,
            "taxRate": 5
        }
    ]
}
```

### Approve PO
**PATCH** `/purchase-orders/:id/approve`
*Permission*: `PO.APPROVE` (Likely required by logic or role)

**Body**:
```json
{
    "status": "APPROVED"
}
```

### Update PO Item Quantity
**PATCH** `/purchase-orders/:id/items/:itemId`
*Permission*: `PO.UPDATE`

**Body**:
```json
{
    "quantity": 150
}
```

> **Note**: There is currently no API endpoint to **List** Purchase Orders.

---

## 9. Goods Received Note (GRN)
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create GRN
**POST** `/grn`
*Permission*: `GRN.CREATE`

**Body**:
```json
{
    "poId": "<POID>",
    "vendorInvoiceNo": "INV-999",
    "workAreaId": "<WorkAreaID>",
    "items": [
        {
            "itemId": "<ItemID>",
            "receivedQty": 100,
            "unitCost": 40
        }
    ]
}
```

### List GRNs
**GET** `/grn`
*Permission*: `GRN.VIEW`

---

## 10. Indents & Inventory
*Requires Header: `Authorization: Bearer <accessToken>`*

### Get Inventory Stock
**GET** `/inventory`
*Permission*: Access restrictions apply (Branch based).

### Create Indent
**POST** `/indents`
*Permission*: `INDENT.CREATE`

**Body**:
```json
{
    "workAreaId": "<WorkAreaID>",
    "items": [
        {
            "itemId": "<ItemID>",
            "requestedQty": 10
        }
    ]
}
```

### List Indents
**GET** `/indents`
*Permission*: `INDENT.VIEW`

### Approve Indent
**PATCH** `/indents/:id/approve`
*Permission*: `INDENT.APPROVE`

### Issue Indent (Move Stock)
**POST** `/indents/issue`
*Permission*: `INDENT.ISSUE`

**Body**:
```json
{
    "indentId": "<IndentID>",
    "items": [
        {
            "itemId": "<ItemID>",
            "issuedQty": 10
        }
    ]
}
```

---

## 11. Audit Logs
*Requires Header: `Authorization: Bearer <accessToken>`*

### List Audit Logs
**GET** `/audit-logs`
*Permission*: `LOGS.VIEW`
