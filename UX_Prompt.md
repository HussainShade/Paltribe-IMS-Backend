# UX Design Prompt - Paltribe IMS

**Goal**: Create a comprehensive, premium, and functional UX design for the Paltribe Inventory Management System (IMS). This design must be pixel-perfect, using modern aesthetics (Glassmorphism, vibrant palettes, clean typography), and strictly mapped to the provided Backend APIs and Data Models.

## 1. General Layout & Navigation
- **Theme**: Premium Dark/Light mode support. Clean, spacious, high contrast.
- **Sidebar Navigation**:
    - Dashboard
    - Procurement (Purchase Orders, Special Orders, GRN, RTV)
    - Inventory (Stock, Indents, Indent Issue)
    - Masters (Items, Categories, Vendors, Work Areas, Branches)
    - Reports
    - User Management
- **Top Bar**:
    - **Branch Selector**: Dropdown to switch context (API: `GET /branches`). Critical for SA (Super Admin).
    - User Profile (Avatar, Name, Role).
    - Notifications.

---

## 2. Authentication Module
**Page: Login**
- **Fields**:
    - Tenant ID (Text)
    - Email (Text)
    - Password (Password)
- **Action**: `POST /auth/login`
- **Behavior**: On success, store `accessToken` and `user` details. Redirect to Dashboard.

---

## 3. Procurement Module

### A. Purchase Orders (PO)
**Page: PO List**
- **API**: `GET /purchase-orders`
- **Table Columns**:
    - PO No (`poId` / `_id`) - *Clickable to View Details*
    - Date (`poDate`)
    - Vendor (`vendorId.vendorName`)
    - Status (`status`: OPEN, APPROVED, CLOSED, CANCELLED) - *Badge Color Coded*
    - Total Amount (`totalAmount`)
    - Created By (`createdBy.name`)
    - Actions: Edit (if OPEN), Cancel (if OPEN), Approved (if OPEN & Role=SA/BM).

**Page: Create PO**
- **API**: `POST /purchase-orders`
- **Header**:
    - Branch: *Auto-filled from Context*
    - Vendor: Dropdown (`GET /vendors`, Searchable) -> Map to `vendorId`
    - PR No: Text Input -> Map to `prNo`
    - PO Date: Date Picker -> Map to `poDate`
    - Delivery Date: Date Picker -> Map to `deliveryDate`
- **Items Section (Table/Repeater)**:
    - Item: Dropdown (`GET /items`, Searchable) -> Map to `itemId`
        - *On Select*: Auto-fill `unitCost`, `hsnCode`, `inventoryUom`.
    - Quantity: Number Input -> Map to `quantity`
    - Unit Cost: Number (Auto/Editable) -> Map to `unitCost`
    - Tax Rate (%): Number (Auto/Editable) -> Map to `taxRate`
    - Total: Calculated (`qty * cost * (1 + tax/100)`)
- **Actions**: "Save Draft", "Create PO".

### B. Goods Received Note (GRN)
**Page: GRN List**
- **API**: `GET /grn`
- **Table Columns**:
    - GRN ID (`grnId` / `_id`)
    - PO No (`poId.poId`)
    - Vendor Invoice (`vendorInvoiceNo`)
    - Invoice Date (`vendorInvoiceDate`)
    - Goods Rcvd Date (`goodsReceivedDate`)
    - Vendor (`poId.vendorId.vendorName`)
    - Status (Derived from PO Status logic if needed)
    - Actions: `Create RTV` (Button).

**Page: Create GRN (Generate from PO)**
- **Context**: Access via "Generate GRN" button on an Approved PO.
- **API**: `POST /grn`
- **Form**:
    - PO No: *Read-only* (`poId`)
    - Work Area: Dropdown (`GET /work-areas`) -> Map to `workAreaId`
    - Vendor Invoice No: Text -> Map to `vendorInvoiceNo`
    - Vendor Invoice Date: Date -> Map to `vendorInvoiceDate`
- **Items Grid**:
    - *Pre-filled from PO Items*.
    - Received Qty: Number (Editable) -> Map to `receivedQty`
    - *Show Variance if Received != Ordered* (Visual Indicator).

### C. Return to Vendor (RTV)
**Page: Create RTV**
- **Context**: Access via "Action -> RTV" on GRN List Row.
- **API**: `POST /rtv`
- **Form**:
    - GRN ID: *Read-only*
    - Item List (from GRN):
        - Item Name
        - Received Qty
        - **Return Qty**: Number Input -> Map to `returnedQty`
        - Reason: Text Input -> Map to `reason`
- **Logic**: User selects item, enters return qty.
- **Action**: "Generate RTV" -> Decrements Stock.

### D. Special Orders (Ad-hoc)
**Page: Special Order List**
- Structure similar to PO List.
**Page: Create SO**
- **API**: `POST /special-orders`
- Similar fields to PO, but no PR No required. Direct entry for urgent/one-time needs.

---

## 4. operations Module (Inventory & Indents)

### A. Inventory Master
**Page: Live Stock**
- **API**: `GET /inventory`
- **Table Columns**:
    - Item Code (`itemCode`)
    - Item Name (`itemName`)
    - Category (`categoryId.name`)
    - UOM (`inventoryUom`)
    - Quantity (`quantityInStock`)
    - Branch (`branchId.branchName`)
    - Work Area (`workAreaId.name`)
- **Action**: "Manual Adjust" (Button -> Modal).

**Modal: Manual Inventory Adjustment**
- **API**: `POST /inventory/adjust`
- **Fields**:
    - Item: Search Select
    - Work Area: Select
    - Quantity: Number (+/-)
    - Reason: Text

### B. Indents (Internal Requests)
**Page: Create Indent**
- **API**: `POST /indents`
- **Form**:
    - Work Area: Dropdown -> `workAreaId`
    - Indent Date: Date -> `indentDate`
    - Remarks: Text -> `remarks`
    - Entry Type: Radio (`OPEN` | `PACKAGE`) -> `entryType`
    - **Items**:
        - Item Name (Search)
        - Current Stock (Display only)
        - Requested Qty -> `requestedQty`
- **Action**: "Raise Indent".

**Page: Indent List & Issue**
- **API**: `GET /indents`
- **Table Columns**:
    - Indent ID
    - Date
    - Work Area
    - Status (`OPEN`, `APPROVED`, `ISSUED`, `REJECTED`)
    - Actions:
        - View Details
        - **Issue** (If Status=APPROVED/OPEN & Role=StoreManager).

**Page/Modal: Issue Indent**
- **API**: `POST /indents/issue`
- **Display**: Value from Indent.
- **Input**:
    - Issued Qty (for each item).
    - *Validation*: Cannot issue more than Stock.

---

## 5. Master Data Management
**Standard Pattern for All**: List View (Table) + Add/Edit Modal/Page.

### A. Items
- **API**: `GET/POST /items`
- **Fields**:
    - Code, Name, HSN Code
    - Category (Dropdown)
    - Ledger (Text), Classification (Text)
    - UOM (Dropdown)
    - Unit Cost, Tax Rate
    - Yield (%), Weight, Lead Time
    - **Package Details** (Dynamic List): Name, Brand, Qty, Price.

### B. Vendors
- **API**: `GET/POST /vendors`
- **Fields**: Name, Contact Info, GST, PAN, TIN, Terms.

### C. Work Areas / Branches / Categories
- Standard Name/Status fields.

---

## 6. Reports Module
**Page: Reports Dashboard**
- **Layout**: Grid of Report Cards (Icon + Title + Description).
- **Clicking a card** opens the Report View with Filters.
- **Report Types** (Mapped to `/reports/*` APIs):
    1.  **Live Stock**: Filters (Branch, Work Area).
    2.  **Purchase Order Status**: Filters (Date Range, Status).
    3.  **Indent Issue**: Filters (Date Range).
    4.  **Consolidated Purchase & Indent**.
    5.  **Rate Variance**: Shows diff between PO Cost and Standard Cost.
    6.  **Invoice Summary**: List GRNs by Vendor/Date.
    7.  **Detailed GRN**: Deep dive into goods received.
    8.  **Supplier Purchase**: Aggregated stats.
- **Common Features**: Date Picker (Range), Export to Excel/PDF buttons.

---

## 7. UX Requirements (Premium)
- **Modals**: Use glassmorphism backdrops, smooth slide-ins.
- **Tables**: Zebra striping (subtle), hover effects, sticky headers, pagination, search bar on top right.
- **Status Badges**:
    - OPEN/ACTIVE: Green/Teal (Subtle bg)
    - PENDING: Orange/Yellow
    - REJECTED/CANCELLED: Red
    - CLOSED/ISSUED: Gray/Blue
- **Feedback**:
    - Success: Toast notification (Top Right).
    - Error: Inline validation text (Red) + Toast for server errors.
    - Loading: Skeleton loaders for tables, spinners for button actions.
