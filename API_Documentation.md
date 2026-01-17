# IMP Backend - API Documentation

Base URL: `http://localhost:3000/api/v1`

This documentation details all available API endpoints, their methods, request bodies, and success responses.

---

## 1. System Health

### Check Health status
**GET** `/health` (No `/api/v1` prefix for this one usually, but let's assume route structure - actually `app.get('/health')` is root)
**URL**: `http://localhost:3000/health`

**Response**:
```json
{
    "status": "ok",
    "uptime": 6849.4452627
}
```

---

## 2. Authentication

### SuperAdmin Login
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
            "tenantId": "<TenantID>",
            "branchId": null,
            "roleId": "<RoleID>",
            "name": "Paltribe Admin",
            "email": "admin@paltribe.com",
            "status": "ACTIVE",
            "createdAt": "2026-01-16T11:34:27.382Z",
            "updatedAt": "2026-01-16T11:34:27.382Z",
            "userId": "<UserID>",
            "id": "<UserID>"
        },
        "permissions": [
            "USER.CREATE",
            "USER.VIEW",
            "USER.UPDATE",
            "USER.DELETE",
            "VENDOR.CREATE",
            "VENDOR.VIEW",
            "VENDOR.UPDATE",
            "VENDOR.DELETE",
            "ITEM.CREATE",
            "ITEM.VIEW",
            "ITEM.UPDATE",
            "ITEM.DELETE",
            "PO.CREATE",
            "PO.APPROVE",
            "GRN.CREATE",
            "INDENT.CREATE",
            "INDENT.APPROVE",
            "INDENT.ISSUE"
        ],
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

**Body**:
```json
{
    "name": "Branch Manager",
    "email": "manager@paltribe.com",
    "password": "password123",
    "roleId": "<RoleID>"
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "tenantId": "<TenantID>",
        "branchId": null,
        "roleId": "<RoleID>",
        "name": "Branch Manager",
        "email": "manager@paltribe.com",
        "status": "ACTIVE",
        "userId": "<UserID>",
        "_id": "<UserID>",
        "createdAt": "...",
        "updatedAt": "...",
        "__v": 0
    }
}
```

### List Users
*Requires Header: `Authorization: Bearer <accessToken>`*
**GET** `/users`
**Query Params**: `?page=1&limit=10`

**Response**:
```json
{
    "status": "success",
    "data": [
        {
            "_id": "<UserID>",
            "tenantId": "<TenantID>",
            "branchId": null,
            "roleId": {
                "_id": "<RoleID>",
                "roleCode": "SA",
                "roleName": "Super Admin"
            },
            "name": "Paltribe Admin",
            "email": "admin@paltribe.com",
            "passwordHash": "...",
            "status": "ACTIVE",
            "createdAt": "...",
            "updatedAt": "...",
            "__v": 0,
            "userId": "<UserID>"
        }
    ],
    "meta": {
        "total": 1,
        "page": 1,
        "limit": 10,
        "totalPages": 1
    }
}
```

---

## 4. Vendor Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Vendor
**POST** `/vendors`

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

**Response**:
```json
{
    "status": "success",
    "data": {
        "tenantId": "<TenantID>",
        "vendorName": "Acme Supplies",
        "gstNo": "GSTIN12345",
        "contactDetails": {
            "phone": "9876543210",
            "email": "contact@acme.com",
            "address": "123 Supply St"
        },
        "status": "ACTIVE",
        "vendorId": "<VendorID>",
        "_id": "<VendorID>",
        "createdAt": "...",
        "updatedAt": "...",
        "__v": 0
    }
}
```

---

## 5. Item Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Item
**POST** `/items`

**Body**:
```json
{
    "itemCode": "VEG-001",
    "itemName": "Fresh Tomato",
    "categoryId": "<CategoryID>",
    "subCategoryId": "<SubCategoryID>",
    "inventoryUom": "KG",
    "unitCost": 40,
    "taxRate": 5
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "tenantId": "<TenantID>",
        "itemCode": "VEG-001",
        "itemName": "Fresh Tomato",
        "categoryId": "<CategoryID>",
        "subCategoryId": "<SubCategoryID>",
        "inventoryUom": "KG",
        "unitCost": 40,
        "taxRate": 5,
        "status": "ACTIVE",
        "_id": "<ItemID>",
        "itemId": "<ItemID>",
        "createdAt": "...",
        "updatedAt": "..."
    }
}
```

---

## 6. Branch Management
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create Branch
**POST** `/branches`
*Required Permission*: `BRANCH.CREATE`

**Body**:
```json
{
    "branchName": "Main Branch",
    "location": "Downtown"
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "tenantId": "<TenantID>",
        "branchName": "Main Branch",
        "location": "Downtown",
        "status": "ACTIVE",
        "branchId": "<BranchID>",
        "_id": "<BranchID>",
        "createdAt": "...",
        "updatedAt": "..."
    }
}
```

### List Branches
**GET** `/branches`
*Required Permission*: `BRANCH.VIEW`

**Response**:
```json
{
    "status": "success",
    "data": [
        {
            "_id": "<BranchID>",
            "tenantId": "<TenantID>",
            "branchName": "Main Branch",
            "location": "Downtown",
            "status": "ACTIVE",
            "branchId": "<BranchID>"
        }
    ]
}
```

---

## 7. Purchase Orders (PO)
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create PO
**POST** `/purchase-orders`

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

**Response**:
```json
{
    "status": "success",
    "data": {
        "poNumber": "PO-...",
        "vendorId": "<VendorID>",
        "status": "DRAFT",
        "items": [...],
        "_id": "<POID>",
        "createdAt": "..."
    }
}
```

### Approve PO
**PATCH** `/purchase-orders/<POID>/approve`

**Body**:
```json
{
    "status": "APPROVED"
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "_id": "<POID>",
        "status": "APPROVED",
        "approvedBy": "<UserID>",
        "approvedAt": "..."
    }
}
```

---

## 8. Goods Received Note (GRN)
*Requires Header: `Authorization: Bearer <accessToken>`*

### Create GRN
**POST** `/grn`

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

**Response**:
```json
{
    "status": "success",
    "data": {
        "grnNumber": "GRN-...",
        "poId": "<POID>",
        "status": "RECEIVED",
        "_id": "<GRNID>",
        "createdAt": "..."
    }
}
```

---

## 9. Indents & Inventory
*Requires Header: `Authorization: Bearer <accessToken>`*

### Get Inventory
**GET** `/inventory`

**Response**:
```json
{
    "status": "success",
    "data": [
        {
            "_id": "<StockID>",
            "itemId": {
                "_id": "<ItemID>",
                "itemName": "Fresh Tomato",
                "itemCode": "VEG-001"
            },
            "quantity": 100
        }
    ]
}
```

### List Indents
**GET** `/indents`
**Query Params**: `?page=1&limit=10&status=OPEN&startDate=...&endDate=...`

**Response**:
```json
{
    "status": "success",
    "data": [
        {
            "_id": "<IndentID>",
            "indentNumber": "IND-...",
            "status": "OPEN",
            "branchId": "<BranchID>",
             ...
        }
    ],
    "meta": {
        "total": 10,
        "page": 1,
        "limit": 10,
        "totalPages": 1
    }
}
```

### Create Indent
**POST** `/indents`

**Body**:
```json
{
    "workAreaId": "<KitchenWorkAreaID>",
    "items": [
        {
            "itemId": "<ItemID>",
            "requestedQty": 10
        }
    ]
}
```

**Response**:
```json
{
    "status": "success",
    "data": {
        "indentNumber": "IND-...",
        "status": "PENDING",
        "_id": "<IndentID>"
    }
}
```
---

## 10. Audit Logs
*Requires Header: `Authorization: Bearer <accessToken>`*

### List Audit Logs
**GET** `/audit-logs`
*Required Permission*: `LOGS.VIEW`

**Response**:
```json
{
    "status": "success",
    "data": [
        {
            "_id": "<LogID>",
            "action": "CREATE_USER",
            "entity": "User",
            "entityId": "<UserID>",
            "performedBy": "<UserID>",
            "details": { "email": "newuser@example.com" },
            "timestamp": "2026-01-17T...",
            "tenantId": "<TenantID>"
        }
    ],
    "meta": {
        "total": 100,
        "page": 1,
        "limit": 10,
        "totalPages": 10
    }
}
```
