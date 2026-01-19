import { Hono } from 'hono';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares';

const reportRoutes = new Hono();

reportRoutes.use('*', authMiddleware);

reportRoutes.get('/live-stock', ReportController.getLiveStock);
reportRoutes.get('/indent-issue', ReportController.getIndentIssue);
reportRoutes.get('/purchase-indent-consolidated', ReportController.getPurchaseIndentConsolidated);
reportRoutes.get('/po-status', ReportController.getPOStatus);
reportRoutes.get('/rate-variance', ReportController.getRateVariance);
reportRoutes.get('/manual-closing', ReportController.getManualClosing);
reportRoutes.get('/invoice-summary', ReportController.getInvoiceSummary);
reportRoutes.get('/store-variance', ReportController.getStoreVariance);
reportRoutes.get('/detailed-grn', ReportController.getDetailedGRN);
reportRoutes.get('/flr', ReportController.getFLR);
reportRoutes.get('/supplier-item-purchase', ReportController.getSupplierItemPurchase);
reportRoutes.get('/supplier-purchase', ReportController.getSupplierPurchase);

export default reportRoutes;
