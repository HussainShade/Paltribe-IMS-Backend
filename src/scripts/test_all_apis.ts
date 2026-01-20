
import { connectDB, disconnectDB } from '../config/database';
import { Tenant, User, Branch, Vendor, Item, WorkArea, Category, PurchaseOrder, InventoryStock, Indent } from '../models';
import mongoose from 'mongoose';

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const SA_EMAIL = 'admin@paltribe.com';
const SA_PASSWORD = 'password123';

// Helper for HTTP requests
async function fetchJson(url: string, options: any = {}) {
    console.log(`📡 ${options.method || 'GET'} ${url}`);

    if (!options.headers) options.headers = {};
    if (options.body && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { error: 'Invalid JSON response' };
    }

    if (!response.ok) {
        throw { status: response.status, data };
    }
    return data;
}

async function runAllTests() {
    console.log('🚀 INITIALIZING COMPREHENSIVE API TEST SUITE...');
    let token: string;
    let headers: any;
    let context: any = {};

    try {
        await connectDB();

        // --- 0. PRE-REQUISITES (DB & CONTEXT) ---
        console.log('\n--- [0. SETUP] ---');
        const tenant = await Tenant.findOne({ status: 'ACTIVE' });
        if (!tenant) throw new Error('No active tenant found.');

        // Get or Create Masters
        let branch = await Branch.findOne({ tenantId: tenant._id });
        if (!branch) {
            branch = await Branch.create({ tenantId: tenant._id, branchName: 'Test Branch', status: 'ACTIVE', location: 'Test Loc' });
            console.log('Created Test Branch');
        }

        let user = await User.findOne({ email: SA_EMAIL });
        if (!user) {
            // Assuming User exists from seed, if not this script fails early which is fine.
            throw new Error('Admin user not found. Run seed.');
        }

        let category = await Category.findOne({ tenantId: tenant._id });
        if (!category) {
            category = await Category.create({ tenantId: tenant._id, name: 'Test Category', status: 'ACTIVE' });
            console.log('Created Test Category');
        }

        let vendor = await Vendor.findOne({ tenantId: tenant._id });
        if (!vendor) {
            vendor = await Vendor.create({ tenantId: tenant._id, vendorName: 'Test Vendor', status: 'ACTIVE' });
            console.log('Created Test Vendor');
        }

        // --- 1. AUTHENTICATION ---
        console.log('\n--- [1. AUTHENTICATION] ---');
        const loginRes = await fetchJson(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: SA_EMAIL, password: SA_PASSWORD, tenantId: tenant._id.toString() })
        });
        token = loginRes.data.accessToken;
        headers = { Authorization: `Bearer ${token}` };
        // Basic SA headers
        headers['x-branch-id'] = branch._id.toString();

        console.log('✅ Login Successful');

        // Verify Profile
        const profile = await fetchJson(`${BASE_URL}/profile/me`, { headers });
        console.log(`✅ Profile Verified: ${profile.data.name} (${profile.data.roleCode})`);


        // --- 2. MASTER DATA (CRUD) ---
        console.log('\n--- [2. MASTER DATA] ---');


        // Work Area
        let workArea = await WorkArea.findOne({ tenantId: tenant._id });
        if (!workArea) {
            const waRes = await fetchJson(`${BASE_URL}/work-areas`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: 'Test Kitchen', branchIds: [branch._id.toString()], status: 'ACTIVE' })
            });
            workArea = waRes.data;
            console.log('✅ Work Area Created via API');
        } else {
            const waList = await fetchJson(`${BASE_URL}/work-areas`, { headers });
            console.log(`✅ Work Areas Listed: ${waList.data.length}`);
        }
        if (!workArea) throw new Error('Failed to retrieve or create workArea.');
        context.workAreaId = workArea._id || (workArea as any).id;

        // Item
        let item = await Item.findOne({ tenantId: tenant._id });
        if (!item) {
            const itemRes = await fetchJson(`${BASE_URL}/items`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    itemCode: `ITM-${Date.now()}`,
                    itemName: 'Test Item',
                    categoryId: category._id.toString(),
                    inventoryUom: 'KG',
                    unitCost: 100,
                    taxRate: 5,
                    ledger: 'Test Ledger',
                    classification: 'Test Class',
                    yield: 100,
                    weight: 1000
                })
            });
            item = itemRes.data;
            console.log('✅ Item Created via API');
        } else {
            const items = await fetchJson(`${BASE_URL}/items`, { headers });
            console.log(`✅ Items Listed: ${items.data.items.length}`);
        }
        if (!item) throw new Error('Failed to retrieve or create item.');
        context.itemId = item._id || (item as any).id;
        context.vendorId = vendor._id.toString();
        context.branchId = branch._id.toString();


        // --- 3. PROCUREMENT (PO -> GRN) ---
        console.log('\n--- [3. PROCUREMENT CYCLE] ---');

        // 3a. Create PO
        const poRes = await fetchJson(`${BASE_URL}/purchase-orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                prNo: 'PR-TEST-101',
                vendorId: context.vendorId,
                branchId: context.branchId, // For SA context support
                deliveryDate: new Date().toISOString(),
                items: [{ itemId: context.itemId, quantity: 50, unitCost: 100 }]
            })
        });
        const poId = poRes.data.poId || poRes.data._id;
        console.log(`✅ PO Created: ${poId}`);

        // 3b. Approve PO
        await fetchJson(`${BASE_URL}/purchase-orders/${poId}/approve`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'APPROVED' })
        });
        console.log('✅ PO Approved');

        // 3c. Create GRN (Receive Stock)
        const grnRes = await fetchJson(`${BASE_URL}/grn`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                poId: poId,
                vendorInvoiceNo: `INV-${Date.now()}`,
                vendorInvoiceDate: new Date().toISOString(),
                workAreaId: context.workAreaId,
                items: [{ itemId: context.itemId, receivedQty: 50, unitCost: 100 }]
            })
        });
        const grnId = grnRes.data.grnId || grnRes.data._id;
        console.log(`✅ GRN Created: ${grnId}`);
        context.grnId = grnId;

        // Verify Stock
        const invRes = await fetchJson(`${BASE_URL}/inventory`, { headers });
        const stockItem = invRes.data.find((s: any) => s.itemId._id === context.itemId || s.itemId === context.itemId);
        console.log(`✅ Inventory Checked. Stock: ${stockItem ? stockItem.quantityInStock : 0}`);


        // --- 4. OPERATIONS (INDENT -> ISSUE) ---
        console.log('\n--- [4. OPERATIONS CYCLE] ---');

        // 4a. Create Indent
        const indentRes = await fetchJson(`${BASE_URL}/indents`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workAreaId: context.workAreaId,
                remarks: 'Test Indent',
                entryType: 'OPEN',
                items: [{ itemId: context.itemId, requestedQty: 10 }]
            })
        });
        const indentId = indentRes.data.indentId || indentRes.data._id;
        console.log(`✅ Indent Created: ${indentId}`);

        // 4b. Approve Indent
        // (Assuming approval is needed or auto-approve? IndentService has approve method)
        await fetchJson(`${BASE_URL}/indents/${indentId}/approve`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: 'APPROVED' }) // Check endpoint specific
        });
        console.log('✅ Indent Approved');

        // 4c. Issue Indent (Reduce Stock)
        // Check route: post /indents/issue or /issue?
        // Defined in indent.routes.ts: indentRoutes.post('/issue', ...)
        const issueRes = await fetchJson(`${BASE_URL}/indents/issue`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                indentId: indentId,
                items: [{ itemId: context.itemId, issuedQty: 10 }]
            })
        });
        console.log(`✅ Indent Issued: ${issueRes.data.issueId || 'Success'}`);


        // --- 5. EXTENDED FEATURES (RTV, SPECIAL ORDER, ADJUST) ---
        console.log('\n--- [5. EXTENDED FEATURES] ---');

        // 5a. RTV
        await fetchJson(`${BASE_URL}/rtv`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                grnId: context.grnId,
                itemId: context.itemId,
                returnedQty: 5,
                reason: 'Test Return'
            })
        });
        console.log('✅ RTV Created');

        // 5b. Special Order
        const soRes = await fetchJson(`${BASE_URL}/special-orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                vendorId: context.vendorId,
                deliveryDate: new Date().toISOString(),
                items: []
            })
        });
        console.log(`✅ Special Order Created: ${soRes.data.soId || soRes.data._id}`);

        // 5c. Manual Adjustment
        await fetchJson(`${BASE_URL}/inventory/adjust`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                itemId: context.itemId,
                workAreaId: context.workAreaId,
                quantity: 1,
                reason: 'Audit add'
            })
        });
        console.log('✅ Manual Adjustment (Add) Successful');


        // --- 6. REPORTING ---
        console.log('\n--- [6. REPORTING] ---');

        const stats = await fetchJson(`${BASE_URL}/dashboard/stats`, { headers });
        console.log('✅ Dashboard Stats OK');

        const report = await fetchJson(`${BASE_URL}/reports/live-stock`, { headers });
        console.log('✅ Live Stock Report OK');


        console.log('\n✨✨ TEST SUITE COMPLETED SUCCESSFULLY ✨✨');

    } catch (error: any) {
        console.error('\n❌ TEST FAILED');
        console.error('Error:', error.message || error);
        if (error.data) console.error('Details:', JSON.stringify(error.data, null, 2));
        process.exit(1);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
}

runAllTests();
